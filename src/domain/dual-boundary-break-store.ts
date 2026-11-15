import {
  createDualBoundaryBreakEvent,
  decodeDualBoundaryHistory,
  dualBoundarySource,
  dualBreakEventKey,
  dualBreakHeadKey,
  dualBreakPrefix,
  type DualBoundaryBreakEvent,
} from './dual-boundary-break-audit.ts';
import {
  CUSTOM_BREAK_WORK_SQL,
  readCustomPayBreakHistory,
  workFromCustomBreakRow,
  type CustomBreakSqlStore,
  type CustomBreakWorkRow,
} from './custom-pay-break-store.ts';
import { customBreakSourcePeriods } from './custom-pay-break-audit.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import { customPayPeriodBounds, zonedPayPeriodBounds } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';

export interface DualBreakSave {
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

export interface DualBoundaryCandidate {
  workId: string;
  startDay: number;
  periodKey: string;
  effectiveDate: string;
  rateBoundaryUtc: string;
  timeZone: string;
  sourceStartUtc: string;
  sourceEndUtc: string;
  originalBreakMinutes: number;
  portionBreakMinutes: number;
  maxBeforeMinutes: number;
  maxAfterMinutes: number;
  payPeriodAuditRevision: number;
  chosenBeforeMinutes: number | null;
  revision: number;
  stale: boolean;
}

export interface DualBoundaryCandidateResult {
  startDay: number;
  candidates: DualBoundaryCandidate[];
  pendingPeriodBreakCount: number;
}

export async function readDualBoundaryHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
): Promise<DualBoundaryBreakEvent[]> {
  const prefix = dualBreakPrefix(work.id, startDay, periodKey);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length,
    prefix,
  );
  return decodeDualBoundaryHistory(work, startDay, periodKey, effectiveDate, rows);
}

function rateEffectiveDate(
  plan: Awaited<ReturnType<typeof loadCustomPayProfilePreviewFromStore>>,
): string {
  if (plan.status !== 'profile_transition_review_required' || plan.segments.length !== 2)
    throw new Error('DUAL_BREAK_REQUIRES_TWO_HOURLY_PROFILES');
  const first = plan.segments[0].profile;
  const second = plan.segments[1].profile;
  if (
    first.model !== 'hourly' ||
    second.model !== 'hourly' ||
    first.currency !== second.currency ||
    first.overtimeAfterMinutes !== second.overtimeAfterMinutes
  )
    throw new Error('DUAL_BREAK_UNSUPPORTED_PROFILE_POLICY');
  return plan.segments[1].startDate;
}

/**
 * Must run inside an exclusive SQLite transaction. All legacy pay-period
 * audit revisions are checked BEFORE accepting a versioned rate suballocation.
 * The new history snapshots its dependent period audit; corrections cannot
 * reuse stale audit revision without a fresh explicit statement.
 */
export async function appendDualBoundaryBreakRevision(
  store: CustomBreakSqlStore,
  input: DualBreakSave,
): Promise<DualBoundaryBreakEvent> {
  dualBreakPrefix(input.workId, input.startDay, input.periodKey);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= 64
  )
    throw new Error('INVALID_DUAL_BREAK_EXPECTED_REVISION');
  const plan = await loadCustomPayProfilePreviewFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('DUAL_BREAK_SETTING_CHANGED');
  if (rateEffectiveDate(plan) !== input.effectiveDate)
    throw new Error('DUAL_BREAK_RATE_EFFECTIVE_DATE_CHANGED');
  const row = await store.getFirstAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL + ' WHERE id=?',
    input.workId,
  );
  if (!row) throw new Error('DUAL_BREAK_WORK_NOT_FOUND');
  const work = validateEarningsWork(workFromCustomBreakRow(row));
  const payHistory = await readCustomPayBreakHistory(store, work, input.startDay);
  const periodAudit = payHistory[payHistory.length - 1];
  if (!periodAudit) throw new Error('DUAL_BREAK_PAY_PERIOD_AUDIT_REQUIRED');
  dualBoundarySource(work, input.startDay, input.periodKey, input.effectiveDate, periodAudit);

  const history = await readDualBoundaryHistory(
    store,
    work,
    input.startDay,
    input.periodKey,
    input.effectiveDate,
  );
  if (history.length !== input.expectedRevision) throw new Error('STALE_DUAL_BREAK_REVISION');
  if (history.length) {
    const previous = history[history.length - 1];
    if (
      previous.beforeRateBreakMinutes === input.beforeRateBreakMinutes &&
      previous.payPeriodAudit.revision === periodAudit.revision
    )
      throw new Error('UNCHANGED_DUAL_BREAK_ALLOCATION');
    if (input.recordedAt < previous.recordedAt) throw new Error('INVALID_DUAL_BREAK_REVISION');
  }
  const event = createDualBoundaryBreakEvent(
    work,
    input.startDay,
    input.periodKey,
    input.effectiveDate,
    periodAudit,
    input.beforeRateBreakMinutes,
    history.length + 1,
    input.reason,
    input.recordedAt,
  );
  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    dualBreakEventKey(work.id, input.startDay, input.periodKey, event.revision),
    JSON.stringify(event),
  );
  const head = dualBreakHeadKey(work.id, input.startDay, input.periodKey);
  if (!history.length) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const updated = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision),
      head,
      String(history.length),
    );
    if (updated.changes !== 1) throw new Error('STALE_DUAL_BREAK_REVISION');
  }
  const check = await readDualBoundaryHistory(
    store,
    work,
    input.startDay,
    input.periodKey,
    input.effectiveDate,
  );
  if (
    check.length !== event.revision ||
    JSON.stringify(check[check.length - 1]) !== JSON.stringify(event)
  )
    throw new Error('DUAL_BREAK_READBACK_MISMATCH');
  return event;
}

/** Read-only source discovery for the separate dual-boundary declaration UI. */
export async function loadDualBoundaryCandidatesFromStore(
  store: Pick<CustomBreakSqlStore, 'getAllAsync' | 'getFirstAsync'>,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<DualBoundaryCandidateResult> {
  const plan = await loadCustomPayProfilePreviewFromStore(store, periodKey, scheduleTimeZone);
  if (plan.startDay === 1) return { startDay: 1, candidates: [], pendingPeriodBreakCount: 0 };
  let effectiveDate: string;
  try {
    effectiveDate = rateEffectiveDate(plan);
  } catch {
    return { startDay: plan.startDay, candidates: [], pendingPeriodBreakCount: 0 };
  }
  const bounds = customPayPeriodBounds(periodKey, plan.startDay);
  const works = await store.getAllAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL +
      ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
    bounds.endDateInclusive,
    bounds.startDate,
  );
  const candidates: DualBoundaryCandidate[] = [];
  let pendingPeriodBreakCount = 0;
  for (const raw of works) {
    const work = validateEarningsWork(workFromCustomBreakRow(raw));
    let keys: { first: string; last: string };
    try {
      keys = customBreakSourcePeriods(work, plan.startDay);
    } catch (error) {
      if (error instanceof Error && error.message === 'WORK_NOT_CROSS_CUSTOM_PAY_PERIOD_BREAK')
        continue;
      throw error;
    }
    if (periodKey !== keys.first && periodKey !== keys.last) continue;
    const zonePeriod = zonedPayPeriodBounds(periodKey, plan.startDay, work.timeZone);
    const rateMidnight = resolveLocalBoundary(effectiveDate, '00:00', work.timeZone, 'reject');
    if (rateMidnight.status !== 'resolved') throw new Error('DUAL_BREAK_MIDNIGHT_UNRESOLVED');
    const rateMs = Date.parse(rateMidnight.instantUtc);
    const start = Math.max(
      Date.parse(work.startInstantUtc),
      Date.parse(zonePeriod.startInstantUtc),
    );
    const end = Math.min(Date.parse(work.endInstantUtc), Date.parse(zonePeriod.endInstantUtc));
    if (!(start < rateMs && rateMs < end)) continue;

    const payHistory = await readCustomPayBreakHistory(store, work, plan.startDay);
    const periodAudit = payHistory[payHistory.length - 1];
    if (!periodAudit) {
      pendingPeriodBreakCount++;
      continue;
    }
    const source = dualBoundarySource(
      work,
      plan.startDay,
      periodKey,
      effectiveDate,
      periodAudit,
    );
    const history = await readDualBoundaryHistory(
      store,
      work,
      plan.startDay,
      periodKey,
      effectiveDate,
    );
    const latest = history[history.length - 1];
    candidates.push({
      workId: work.id,
      startDay: plan.startDay,
      periodKey,
      effectiveDate,
      rateBoundaryUtc: source.rateBoundaryUtc,
      timeZone: work.timeZone,
      sourceStartUtc: work.startInstantUtc,
      sourceEndUtc: work.endInstantUtc,
      originalBreakMinutes: work.breakMinutes,
      portionBreakMinutes: source.portion.breakMinutes,
      maxBeforeMinutes: Math.floor(source.beforeSeconds / 60),
      maxAfterMinutes: Math.floor(source.afterSeconds / 60),
      payPeriodAuditRevision: periodAudit.revision,
      chosenBeforeMinutes: latest?.beforeRateBreakMinutes ?? null,
      revision: latest?.revision ?? 0,
      stale: latest !== undefined && latest.payPeriodAudit.revision !== periodAudit.revision,
    });
  }
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('DUAL_BREAK_SETTING_CHANGED');
  return { startDay: plan.startDay, candidates, pendingPeriodBreakCount };
}
