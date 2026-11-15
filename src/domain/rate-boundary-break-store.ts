import {
  createRateBreakEvent,
  decodeRateBreakHistory,
  rateBreakEventKey,
  rateBreakHeadKey,
  rateBreakPrefix,
  rateBreakSource,
  type RateBoundaryBreakEvent,
} from './rate-boundary-break-audit.ts';
import {
  CUSTOM_BREAK_WORK_SQL,
  workFromCustomBreakRow,
  type CustomBreakWorkRow,
  type CustomBreakSqlStore,
} from './custom-pay-break-store.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import { customPayPeriodBounds } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

export type RateBreakSqlStore = CustomBreakSqlStore;

export interface RateBreakSave {
  workId: string;
  startDay: number;
  periodKey: string;
  scheduleTimeZone: string;
  effectiveDate: string;
  beforeRateBreakMinutes: number;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

function effectiveBoundary(plan: Awaited<ReturnType<typeof loadCustomPayProfilePreviewFromStore>>): string {
  if (plan.status !== 'profile_transition_review_required' || plan.segments.length !== 2)
    throw new Error('RATE_BREAK_REQUIRES_TWO_PROFILES');
  const before = plan.segments[0].profile;
  const after = plan.segments[1].profile;
  if (
    before.model !== 'hourly' ||
    after.model !== 'hourly' ||
    before.currency !== after.currency ||
    before.overtimeAfterMinutes !== after.overtimeAfterMinutes
  ) throw new Error('RATE_BREAK_PROFILES_UNSUPPORTED');
  return plan.segments[1].startDate;
}

export async function readRateBreakHistory(
  store: Pick<RateBreakSqlStore, 'getAllAsync'>,
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
): Promise<RateBoundaryBreakEvent[]> {
  const prefix = rateBreakPrefix(work.id, startDay, periodKey);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?) = ? ORDER BY key',
    prefix.length, prefix,
  );
  return decodeRateBreakHistory(work, startDay, periodKey, effectiveDate, rows);
}

/**
 * Caller provides SQLite withExclusiveTransactionAsync. Inserts each accepted
 * immutable event once; the mutable head pointer advances atomically. This
 * does not protect against direct SQLite modification by an outside actor.
 */
export async function appendRateBreakRevision(
  store: RateBreakSqlStore,
  input: RateBreakSave,
): Promise<RateBoundaryBreakEvent> {
  rateBreakPrefix(input.workId, input.startDay, input.periodKey);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= 64
  ) throw new Error('INVALID_RATE_BREAK_EXPECTED_REVISION');

  const plan = await loadCustomPayProfilePreviewFromStore(
    store, input.periodKey, input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('RATE_BREAK_SETTING_CHANGED');
  if (effectiveBoundary(plan) !== input.effectiveDate)
    throw new Error('RATE_BREAK_EFFECTIVE_DATE_CHANGED');
  const row = await store.getFirstAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL + ' WHERE id = ?', input.workId,
  );
  if (!row) throw new Error('RATE_BREAK_WORK_NOT_FOUND');
  const work = validateEarningsWork(workFromCustomBreakRow(row));
  rateBreakSource(work, input.startDay, input.periodKey, input.effectiveDate);

  const history = await readRateBreakHistory(
    store, work, input.startDay, input.periodKey, input.effectiveDate,
  );
  if (history.length !== input.expectedRevision)
    throw new Error('STALE_RATE_BREAK_REVISION');
  if (
    history.length &&
    history[history.length - 1].beforeRateBreakMinutes === input.beforeRateBreakMinutes
  ) throw new Error('UNCHANGED_RATE_BREAK_ALLOCATION');
  if (history.length && input.recordedAt < history[history.length - 1].recordedAt)
    throw new Error('INVALID_RATE_BREAK_REVISION');

  const event = createRateBreakEvent(
    work, input.startDay, input.periodKey, input.effectiveDate,
    input.beforeRateBreakMinutes, history.length + 1, input.reason, input.recordedAt,
  );
  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    rateBreakEventKey(work.id, input.startDay, input.periodKey, event.revision),
    JSON.stringify(event),
  );
  const head = rateBreakHeadKey(work.id, input.startDay, input.periodKey);
  if (history.length === 0) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const updated = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision), head, String(history.length),
    );
    if (updated.changes !== 1) throw new Error('STALE_RATE_BREAK_REVISION');
  }
  const latest = await readRateBreakHistory(
    store, work, input.startDay, input.periodKey, input.effectiveDate,
  );
  if (
    latest.length !== event.revision ||
    JSON.stringify(latest[latest.length - 1]) !== JSON.stringify(event)
  ) throw new Error('RATE_BREAK_READBACK_MISMATCH');
  return event;
}

export interface RateBreakCandidate {
  workId: string;
  periodKey: string;
  startDay: number;
  effectiveDate: string;
  boundaryUtc: string;
  timeZone: string;
  sourceStartUtc: string;
  sourceEndUtc: string;
  originalBreakMinutes: number;
  maxBeforeMinutes: number;
  maxAfterMinutes: number;
  chosenBeforeMinutes: number | null;
  revision: number;
}

export interface RateBreakCandidateResult {
  startDay: number;
  candidates: RateBreakCandidate[];
  unsupportedCrossPeriodCount: number;
}

/** Read-only UI source discovery. Only fully-contained period works qualify. */
export async function loadRateBreakCandidatesFromStore(
  store: Pick<RateBreakSqlStore, 'getAllAsync' | 'getFirstAsync'>,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<RateBreakCandidateResult> {
  const plan = await loadCustomPayProfilePreviewFromStore(
    store, periodKey, scheduleTimeZone,
  );
  if (plan.startDay === 1)
    return { startDay: 1, candidates: [], unsupportedCrossPeriodCount: 0 };
  const bounds = customPayPeriodBounds(periodKey, plan.startDay);
  let boundary: string;
  try {
    boundary = effectiveBoundary(plan);
  } catch {
    return { startDay: plan.startDay, candidates: [], unsupportedCrossPeriodCount: 0 };
  }
  const rows = await store.getAllAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL +
      ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
    bounds.endDateInclusive, bounds.startDate,
  );
  const candidates: RateBreakCandidate[] = [];
  let unsupportedCrossPeriodCount = 0;
  for (const row of rows) {
    const work = validateEarningsWork(workFromCustomBreakRow(row));
    try {
      const resolved = rateBreakSource(work, plan.startDay, periodKey, boundary);
      const history = await readRateBreakHistory(
        store, work, plan.startDay, periodKey, boundary,
      );
      const latest = history[history.length - 1];
      candidates.push({
        workId: work.id,
        periodKey,
        startDay: plan.startDay,
        effectiveDate: boundary,
        boundaryUtc: resolved.boundaryUtc,
        timeZone: work.timeZone,
        sourceStartUtc: work.startInstantUtc,
        sourceEndUtc: work.endInstantUtc,
        originalBreakMinutes: work.breakMinutes,
        maxBeforeMinutes: Math.floor(resolved.beforeSeconds / 60),
        maxAfterMinutes: Math.floor(resolved.afterSeconds / 60),
        chosenBeforeMinutes: latest?.beforeRateBreakMinutes ?? null,
        revision: latest?.revision ?? 0,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_BREAK_REQUIRES_SINGLE_PAY_PERIOD_WORK')
        unsupportedCrossPeriodCount++;
      else if (
        !(error instanceof Error) ||
        !['RATE_BREAK_REQUIRES_POSITIVE_BREAK','WORK_NOT_CROSS_RATE_BOUNDARY','PAY_PERIOD_BREAK_ALLOCATION_REQUIRED'].includes(error.message)
      ) throw error;
    }
  }
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('RATE_BREAK_SETTING_CHANGED');
  return { startDay: plan.startDay, candidates, unsupportedCrossPeriodCount };
}
