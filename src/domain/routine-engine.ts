import {
  calendarOrdinal,
  cycleIndex,
  resolveShift,
  type ShiftSchedule,
} from './shift-engine.ts';

export interface RoutineRecurrence {
  version: 1;
  /** Empty list: any. OR within each dimension, AND across dimensions. */
  shiftIds: string[];
  weekdays: number[];
  /** Zero-based cycle positions. Not limited to seven days. */
  cycleDays: number[];
  /** Only scheduled rest days if true. */
  restOnly: boolean;
}

export interface RoutineRule {
  id: string;
  title: string;
  recurrence: RoutineRecurrence;
  enabled: boolean;
  archivedAt: string | null;
  revision: number;
}

export interface RoutineEvent {
  id: string;
  routineId: string;
  localDate: string;
  action: 'completed' | 'uncompleted';
  titleSnapshot: string;
  recurrenceSnapshot: string;
  occurredAt: string;
}

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/;
const SHIFT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export const EVERY_DAY: Readonly<RoutineRecurrence> = Object.freeze({
  version: 1,
  shiftIds: [],
  weekdays: [],
  cycleDays: [],
  restOnly: false,
});

function uniqueIntegers(value: unknown, max: number, name: string): number[] {
  if (!Array.isArray(value) || value.length > max + 1) throw new Error('INVALID_' + name);
  const result: number[] = [];
  for (const item of value) {
    if (!Number.isSafeInteger(item) || item < 0 || item > max)
      throw new Error('INVALID_' + name);
    if (!result.includes(item)) result.push(item);
  }
  return result.sort((a, b) => a - b);
}

export function validateRecurrence(input: unknown): RoutineRecurrence {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('INVALID_RECURRENCE');
  const record = input as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.restOnly !== 'boolean' ||
    !Array.isArray(record.shiftIds) ||
    record.shiftIds.length > 100
  ) throw new Error('INVALID_RECURRENCE');
  if (!record.shiftIds.every((id) => typeof id === 'string' && SHIFT_ID.test(id)))
    throw new Error('INVALID_SHIFT_FILTER');
  const shiftIds = [...new Set(record.shiftIds as string[])].sort();
  return {
    version: 1,
    shiftIds,
    weekdays: uniqueIntegers(record.weekdays, 7, 'WEEKDAY')
      .map((n) => {
        if (n === 0) throw new Error('INVALID_WEEKDAY');
        return n;
      }),
    cycleDays: uniqueIntegers(record.cycleDays, 365, 'CYCLE_DAY'),
    restOnly: record.restOnly,
  };
}

export function validateRoutine(input: RoutineRule): RoutineRule {
  if (!ID.test(input.id)) throw new Error('INVALID_ROUTINE_ID');
  const title = input.title.trim();
  if (!title || title.length > 80) throw new Error('INVALID_ROUTINE_TITLE');
  if (typeof input.enabled !== 'boolean') throw new Error('INVALID_ROUTINE_ENABLED');
  if (input.archivedAt !== null && (
    typeof input.archivedAt !== 'string' || !Number.isFinite(Date.parse(input.archivedAt))
  )) throw new Error('INVALID_ROUTINE_ARCHIVED');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1)
    throw new Error('INVALID_ROUTINE_REVISION');
  return { ...input, title, recurrence: validateRecurrence(input.recurrence) };
}

/**
 * A task belongs to the shift's START/CYCLE civil date in the saved IANA
 * schedule zone. Overnight shifts are not moved into their finishing day.
 */
export function routineMatchesDate(
  rule: RoutineRule,
  localDate: string,
  schedule: ShiftSchedule,
): boolean {
  calendarOrdinal(localDate);
  if (!schedule.pattern || !rule.enabled || rule.archivedAt !== null) return false;
  const recurrence = validateRecurrence(rule.recurrence);
  const shift = resolveShift(localDate, schedule);
  if (!shift) return false;
  if (recurrence.restOnly && !shift.template.isRestDay) return false;
  if (recurrence.shiftIds.length && !recurrence.shiftIds.includes(shift.template.id))
    return false;
  const weekday = ((new Date(calendarOrdinal(localDate) * 86_400_000).getUTCDay() + 6) % 7) + 1;
  if (recurrence.weekdays.length && !recurrence.weekdays.includes(weekday)) return false;
  const position = cycleIndex(localDate, schedule.pattern);
  if (recurrence.cycleDays.length && !recurrence.cycleDays.includes(position))
    return false;
  return true;
}

export function tasksForDate(
  rules: readonly RoutineRule[],
  localDate: string,
  schedule: ShiftSchedule,
  completedIds: ReadonlySet<string>,
): Array<{ rule: RoutineRule; completed: boolean }> {
  return rules
    .filter((rule) => routineMatchesDate(rule, localDate, schedule))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    .map((rule) => ({ rule, completed: completedIds.has(rule.id) }));
}
