import {
  addCalendarDays,
  calendarDateInZone,
  calendarOrdinal,
  type ShiftSchedule,
} from './shift-engine.ts';
import { routineMatchesDate, type RoutineRule } from './routine-engine.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';

/** Do not exhaust iOS' finite pending notification slots; bound work per sync. */
export const REMINDER_HORIZON_DAYS = 14;
export const MAX_PENDING_ROUTINE_REMINDERS = 48;
export const MAX_REMINDERS_PER_DAY = 6;
export const REMINDER_OWNER = 'vardiyum-routine-v1';
export const REMINDER_CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface ReminderPlanItem {
  key: string;
  routineId: string;
  localDate: string;
  title: string;
  timeZone: string;
  clock: string;
  ruleRevision: number;
  whenUtc: string;
}

export interface ReminderPlan {
  items: ReminderPlanItem[];
  skippedAmbiguous: number;
  skippedNonexistent: number;
  skippedAlreadyCompleted: number;
  skippedOverLimit: number;
  skippedStaleTimeZone: number;
}

export function reminderKey(
  routineId: string,
  localDate: string,
  clock: string,
  zone: string,
  revision: number,
): string {
  return JSON.stringify(['routine', 1, routineId, localDate, clock, zone, revision]);
}

export function completionKey(id: string, date: string): string {
  return JSON.stringify([id, date]);
}

/**
 * Date-only one-shot reminders in the schedule's saved IANA time zone.
 * Never uses the host's local timezone to parse the intended clock.
 * DST folds/gaps are deliberately skipped, never silently guessed.
 */
export function planRoutineReminders(
  schedule: ShiftSchedule,
  rules: readonly RoutineRule[],
  completedKeys: ReadonlySet<string>,
  now: Date,
  horizon = REMINDER_HORIZON_DAYS,
): ReminderPlan {
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 31)
    throw new Error('INVALID_REMINDER_HORIZON');
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_CURRENT_TIME');
  const result: ReminderPlan = {
    items: [],
    skippedAmbiguous: 0,
    skippedNonexistent: 0,
    skippedAlreadyCompleted: 0,
    skippedOverLimit: 0,
    skippedStaleTimeZone: 0,
  };
  if (!schedule.pattern) return result;
  const first = calendarDateInZone(schedule.timeZone, now);
  calendarOrdinal(first);
  const all: ReminderPlanItem[] = [];
  for (let day = 0; day < horizon; day++) {
    const localDate = addCalendarDays(first, day);
    for (const rule of rules) {
      const clock = rule.reminderClock ?? null;
      if (!clock || !rule.enabled || rule.archivedAt !== null) continue;
      if (!REMINDER_CLOCK.test(clock)) throw new Error('INVALID_REMINDER_CLOCK');
      if (rule.reminderTimeZone !== schedule.timeZone) {
        result.skippedStaleTimeZone++;
        continue;
      }
      if (!routineMatchesDate(rule, localDate, schedule)) continue;
      if (completedKeys.has(completionKey(rule.id, localDate))) {
        result.skippedAlreadyCompleted++;
        continue;
      }
      const boundary = resolveLocalBoundary(localDate, clock, schedule.timeZone);
      if (boundary.status === 'ambiguous') {
        result.skippedAmbiguous++;
        continue;
      }
      if (boundary.status === 'nonexistent') {
        result.skippedNonexistent++;
        continue;
      }
      if (Date.parse(boundary.instantUtc) <= now.getTime() + 10_000) continue;
      all.push({
        key: reminderKey(rule.id, localDate, clock, schedule.timeZone, rule.revision),
        routineId: rule.id,
        localDate,
        title: rule.title,
        timeZone: schedule.timeZone,
        clock,
        ruleRevision: rule.revision,
        whenUtc: boundary.instantUtc,
      });
    }
  }
  // Earliest first is fair to users with long daily rules and finite OS slots.
  all.sort(
    (a, b) => a.whenUtc.localeCompare(b.whenUtc) || a.routineId.localeCompare(b.routineId),
  );
  const seen = new Set<string>();
  const dayCounts = new Map<string, number>();
  for (const candidate of all) {
    if (seen.has(candidate.key)) continue;
    seen.add(candidate.key);
    const count = dayCounts.get(candidate.localDate) ?? 0;
    if (
      count >= MAX_REMINDERS_PER_DAY ||
      result.items.length >= MAX_PENDING_ROUTINE_REMINDERS
    ) {
      result.skippedOverLimit++;
      continue;
    }
    dayCounts.set(candidate.localDate, count + 1);
    result.items.push(candidate);
  }
  return result;
}

export interface ScheduledReminder {
  identifier: string;
  /** Only explicitly managed requests have this owner and key. */
  owner: string | undefined;
  key: string | undefined;
}
export interface ReminderSchedulerPort {
  list(): Promise<ScheduledReminder[]>;
  schedule(item: ReminderPlanItem): Promise<string>;
  cancel(identifier: string): Promise<void>;
}
export interface ReminderReconcileResult {
  kept: number;
  scheduled: number;
  canceled: number;
}

/**
 * Reconciles only Vardiyum-owned requests; never cancelAll (other alerts may
 * belong to a different subsystem). Duplicate owned keys are removed.
 * Scheduling new items first avoids losing valid reminders on API failure.
 */
export async function reconcileReminderRequests(
  port: ReminderSchedulerPort,
  desired: readonly ReminderPlanItem[],
): Promise<ReminderReconcileResult> {
  const pending = await port.list();
  const keys = new Set<string>();
  for (const item of desired) {
    if (keys.has(item.key)) throw new Error('DUPLICATE_REMINDER_KEY');
    keys.add(item.key);
  }
  const byKey = new Map<string, ScheduledReminder>();
  const stale: ScheduledReminder[] = [];
  for (const row of pending) {
    if (row.owner !== REMINDER_OWNER) continue;
    if (!row.key || !keys.has(row.key) || byKey.has(row.key)) stale.push(row);
    else byKey.set(row.key, row);
  }
  let scheduled = 0;
  for (const row of desired) {
    if (byKey.has(row.key)) continue;
    await port.schedule(row);
    scheduled++;
  }
  let canceled = 0;
  for (const row of stale) {
    await port.cancel(row.identifier);
    canceled++;
  }
  return { kept: byKey.size, scheduled, canceled };
}
