import {
  createFixedTransitionBaseEvent,
  decodeFixedTransitionHistory,
  eligibleFixedTransition,
  fixedTransitionEventKey,
  fixedTransitionHeadKey,
  fixedTransitionMatchesPlan,
  fixedTransitionPrefix,
  FIXED_TRANSITION_MAX_REVISIONS,
  type FixedTransitionBaseEvent,
} from './custom-fixed-transition-policy.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import type { CustomBreakSqlStore } from './custom-pay-break-store.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

export interface SaveFixedTransitionBase {
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  declaredBaseMinorUnits: [number, number];
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

interface ReviewSegment {
  profileId: string;
  profileRevision: number;
  sourceFullBaseMinorUnits: number;
  declaredBaseMinorUnits: number | null;
  startDate: string;
  endDateInclusive: string;
  startInstantUtc: string;
  endInstantUtc: string;
}

export type FixedTransitionBaseReview =
  | { status: 'not_applicable'; periodKey: string; startDay: number }
  | { status: 'blocked'; periodKey: string; startDay: number; reasons: string[] }
  | {
      status: 'review';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      currency: string;
      timeZone: string;
      segments: [ReviewSegment, ReviewSegment];
      latestRevision: number;
      stale: boolean;
      declaredBaseTotalMinorUnits: number | null;
      scope: 'TWO_FIXED_PROFILE_BASE_DECLARATION_ONLY';
    };

export async function readFixedTransitionHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  periodKey: string,
  day: number,
): Promise<FixedTransitionBaseEvent[]> {
  const prefix = fixedTransitionPrefix(periodKey, day);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length,
    prefix,
  );
  return decodeFixedTransitionHistory(periodKey, day, rows);
}

/**
 * MUST run inside one exclusive SQLite transaction. An app-level immutable
 * history and optimistic head pointer; not cryptographic DB tamper protection.
 */
export async function appendFixedTransitionBaseRevision(
  store: CustomBreakSqlStore,
  input: SaveFixedTransitionBase,
): Promise<FixedTransitionBaseEvent> {
  fixedTransitionPrefix(input.periodKey, input.startDay);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= FIXED_TRANSITION_MAX_REVISIONS
  )
    throw new Error('INVALID_FIXED_TRANSITION_EXPECTED_REVISION');

  const plan = await loadCustomPayProfilePreviewFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('FIXED_TRANSITION_START_DAY_CHANGED');
  eligibleFixedTransition(plan);
  const previous = await readFixedTransitionHistory(store, input.periodKey, input.startDay);
  if (previous.length !== input.expectedRevision)
    throw new Error('STALE_FIXED_TRANSITION_REVISION');

  const event = createFixedTransitionBaseEvent(
    plan,
    input.declaredBaseMinorUnits,
    previous.length + 1,
    input.reason,
    input.recordedAt,
  );
  const latest = previous[previous.length - 1];
  if (latest) {
    if (event.recordedAt < latest.recordedAt)
      throw new Error('INVALID_FIXED_TRANSITION_REVISION');
    if (
      event.scheduleTimeZone === latest.scheduleTimeZone &&
      JSON.stringify(event.segments) === JSON.stringify(latest.segments)
    )
      throw new Error('UNCHANGED_FIXED_TRANSITION_CHOICE');
  }

  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    fixedTransitionEventKey(input.periodKey, input.startDay, event.revision),
    JSON.stringify(event),
  );
  const head = fixedTransitionHeadKey(input.periodKey, input.startDay);
  if (previous.length === 0) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const result = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision),
      head,
      String(previous.length),
    );
    if (result.changes !== 1) throw new Error('STALE_FIXED_TRANSITION_REVISION');
  }
  const readback = await readFixedTransitionHistory(store, input.periodKey, input.startDay);
  if (
    readback.length !== event.revision ||
    JSON.stringify(readback[readback.length - 1]) !== JSON.stringify(event)
  )
    throw new Error('FIXED_TRANSITION_READBACK_MISMATCH');
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('FIXED_TRANSITION_SETTING_CHANGED_DURING_SAVE');
  return event;
}

/** No full custom earnings are produced here: BASE DECLARATION ONLY. */
export async function loadFixedTransitionBaseReviewFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
  timeZone: string,
): Promise<FixedTransitionBaseReview> {
  const plan = await loadCustomPayProfilePreviewFromStore(store, periodKey, timeZone);
  if (
    plan.startDay === 1 ||
    plan.status === 'single_hourly_profile' ||
    plan.status === 'fixed_salary_assumption_required' ||
    plan.status === 'needs_profile' ||
    (plan.status === 'profile_transition_review_required' &&
      plan.segments.every((segment) => segment.profile.model === 'hourly'))
  )
    return { status: 'not_applicable', periodKey, startDay: plan.startDay };
  let segments: ReturnType<typeof eligibleFixedTransition>;
  try {
    segments = eligibleFixedTransition(plan);
  } catch (e) {
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: [e instanceof Error ? e.message : 'FIXED_TRANSITION_UNSUPPORTED'],
    };
  }
  const history = await readFixedTransitionHistory(store, periodKey, plan.startDay);
  const latest = history[history.length - 1];
  const stale = latest ? !fixedTransitionMatchesPlan(plan, latest) : false;
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('FIXED_TRANSITION_SETTING_CHANGED_DURING_READ');
  return {
    status: 'review',
    periodKey,
    startDay: plan.startDay,
    startDate: plan.startDate,
    endDateInclusive: plan.endDateInclusive,
    currency: segments[0].profile.currency,
    timeZone: plan.timeZone,
    segments: segments.map((segment, index) => ({
      profileId: segment.profile.id,
      profileRevision: segment.profile.revision,
      sourceFullBaseMinorUnits: segment.profile.baseMinorUnits,
      declaredBaseMinorUnits:
        latest && !stale ? latest.segments[index].declaredBaseMinorUnits : null,
      startDate: segment.startDate,
      endDateInclusive: segment.endDateInclusive,
      startInstantUtc: segment.startInstantUtc,
      endInstantUtc: segment.endInstantUtc,
    })) as [ReviewSegment, ReviewSegment],
    latestRevision: history.length,
    stale,
    declaredBaseTotalMinorUnits: latest && !stale ? latest.declaredBaseTotalMinorUnits : null,
    scope: 'TWO_FIXED_PROFILE_BASE_DECLARATION_ONLY',
  };
}
