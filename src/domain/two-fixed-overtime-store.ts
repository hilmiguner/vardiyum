import {
  createTwoFixedOvertimePolicyEvent,
  decodeTwoFixedOvertimePolicyHistory,
  twoFixedOvertimeEventKey,
  twoFixedOvertimeHeadKey,
  twoFixedOvertimePolicyMatches,
  twoFixedOvertimePrefix,
  TWO_FIXED_OT_MAX_REVISIONS,
  type TwoFixedOvertimeDecision,
  type TwoFixedOvertimePolicyEvent,
  type TwoFixedThresholdMode,
} from './two-fixed-overtime-policy.ts';
import {
  eligibleFixedTransition,
  fixedTransitionMatchesPlan,
} from './custom-fixed-transition-policy.ts';
import {
  loadFixedTransitionBaseReviewFromStore,
  readFixedTransitionHistory,
} from './custom-fixed-transition-store.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import type { CustomBreakSqlStore } from './custom-pay-break-store.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

export interface SaveTwoFixedOvertimePolicy {
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  decision: TwoFixedOvertimeDecision;
  thresholdMode: TwoFixedThresholdMode | null;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

interface TwoFixedOvertimeReviewSegment {
  profileId: string;
  profileRevision: number;
  thresholdMinutes: number | null;
  overtimeHourlyMinorUnits: number;
  multiplierNumerator: number;
  multiplierDenominator: number;
}

export type TwoFixedOvertimePolicyReview =
  | { status: 'not_applicable' | 'requires_base'; periodKey: string; startDay: number }
  | { status: 'blocked'; periodKey: string; startDay: number; reasons: string[] }
  | {
      status: 'review';
      periodKey: string;
      startDay: number;
      currency: string;
      baseRevision: number;
      baseTotalMinorUnits: number;
      segments: [TwoFixedOvertimeReviewSegment, TwoFixedOvertimeReviewSegment];
      canInclude: boolean;
      latestRevision: number;
      stale: boolean;
      latestDecision: TwoFixedOvertimeDecision | null;
      latestThresholdMode: TwoFixedThresholdMode | null;
      scope: 'EXPLICIT_TWO_FIXED_OVERTIME_POLICY_NO_PRICING';
    };

export async function readTwoFixedOvertimePolicyHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  periodKey: string,
  startDay: number,
): Promise<TwoFixedOvertimePolicyEvent[]> {
  const prefix = twoFixedOvertimePrefix(periodKey, startDay);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length,
    prefix,
  );
  return decodeTwoFixedOvertimePolicyHistory(periodKey, startDay, rows);
}

/** MUST run inside SQLite withExclusiveTransactionAsync. */
export async function appendTwoFixedOvertimePolicyRevision(
  store: CustomBreakSqlStore,
  input: SaveTwoFixedOvertimePolicy,
): Promise<TwoFixedOvertimePolicyEvent> {
  twoFixedOvertimePrefix(input.periodKey, input.startDay);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= TWO_FIXED_OT_MAX_REVISIONS
  )
    throw new Error('INVALID_TWO_FIXED_OT_EXPECTED_REVISION');
  const plan = await loadCustomPayProfilePreviewFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('TWO_FIXED_OT_SETTING_CHANGED');
  eligibleFixedTransition(plan);
  const baseReport = await loadFixedTransitionBaseReviewFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (
    baseReport.status !== 'review' ||
    baseReport.declaredBaseTotalMinorUnits === null ||
    baseReport.stale
  )
    throw new Error('TWO_FIXED_OT_CURRENT_BASE_REQUIRED');
  const bases = await readFixedTransitionHistory(store, input.periodKey, input.startDay);
  const base = bases[bases.length - 1];
  if (
    !base ||
    !fixedTransitionMatchesPlan(plan, base) ||
    base.revision !== baseReport.latestRevision ||
    base.declaredBaseTotalMinorUnits !== baseReport.declaredBaseTotalMinorUnits
  )
    throw new Error('TWO_FIXED_OT_BASE_READBACK_MISMATCH');
  const history = await readTwoFixedOvertimePolicyHistory(
    store,
    input.periodKey,
    input.startDay,
  );
  if (history.length !== input.expectedRevision) throw new Error('STALE_TWO_FIXED_OT_REVISION');
  const event = createTwoFixedOvertimePolicyEvent(
    plan,
    base,
    input.decision,
    input.thresholdMode,
    history.length + 1,
    input.reason,
    input.recordedAt,
  );
  const last = history[history.length - 1];
  if (last) {
    if (event.recordedAt < last.recordedAt) throw new Error('INVALID_TWO_FIXED_OT_REVISION');
    if (
      event.decision === last.decision &&
      event.thresholdMode === last.thresholdMode &&
      JSON.stringify(event.fixedTransitionBase) === JSON.stringify(last.fixedTransitionBase)
    )
      throw new Error('UNCHANGED_TWO_FIXED_OT_DECISION');
  }
  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    twoFixedOvertimeEventKey(input.periodKey, input.startDay, event.revision),
    JSON.stringify(event),
  );
  const head = twoFixedOvertimeHeadKey(input.periodKey, input.startDay);
  if (history.length === 0) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const change = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision),
      head,
      String(history.length),
    );
    if (change.changes !== 1) throw new Error('STALE_TWO_FIXED_OT_REVISION');
  }
  const verify = await readTwoFixedOvertimePolicyHistory(
    store,
    input.periodKey,
    input.startDay,
  );
  if (
    verify.length !== event.revision ||
    JSON.stringify(verify[verify.length - 1]) !== JSON.stringify(event)
  )
    throw new Error('TWO_FIXED_OT_READBACK_MISMATCH');
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('TWO_FIXED_OT_SETTING_CHANGED_DURING_SAVE');
  return event;
}

/**
 * Consent REVIEW ONLY. No logged work, break allocation, overtime pricing,
 * adjustment attribution, or full combined earnings are inferred.
 */
export async function loadTwoFixedOvertimePolicyReviewFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
  timeZone: string,
): Promise<TwoFixedOvertimePolicyReview> {
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
  } catch (error) {
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: [error instanceof Error ? error.message : 'TWO_FIXED_OT_UNSUPPORTED'],
    };
  }
  const baseReport = await loadFixedTransitionBaseReviewFromStore(store, periodKey, timeZone);
  if (
    baseReport.status !== 'review' ||
    baseReport.declaredBaseTotalMinorUnits === null ||
    baseReport.stale
  )
    return { status: 'requires_base', periodKey, startDay: plan.startDay };
  const bases = await readFixedTransitionHistory(store, periodKey, plan.startDay);
  const base = bases[bases.length - 1];
  if (
    !base ||
    !fixedTransitionMatchesPlan(plan, base) ||
    base.revision !== baseReport.latestRevision ||
    base.declaredBaseTotalMinorUnits !== baseReport.declaredBaseTotalMinorUnits
  )
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: ['TWO_FIXED_OT_BASE_READBACK_MISMATCH'],
    };
  const history = await readTwoFixedOvertimePolicyHistory(store, periodKey, plan.startDay);
  const current = history[history.length - 1];
  const stale = current ? !twoFixedOvertimePolicyMatches(plan, base, current) : false;
  const canInclude = segments.every(
    (segment) =>
      segment.profile.overtimeAfterMinutes !== null &&
      segment.profile.overtimeHourlyMinorUnits > 0,
  );
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('TWO_FIXED_OT_SETTING_CHANGED_DURING_READ');
  return {
    status: 'review',
    periodKey,
    startDay: plan.startDay,
    currency: segments[0].profile.currency,
    baseRevision: base.revision,
    baseTotalMinorUnits: base.declaredBaseTotalMinorUnits,
    segments: segments.map((segment) => ({
      profileId: segment.profile.id,
      profileRevision: segment.profile.revision,
      thresholdMinutes: segment.profile.overtimeAfterMinutes,
      overtimeHourlyMinorUnits: segment.profile.overtimeHourlyMinorUnits,
      multiplierNumerator: segment.profile.overtimeMultiplierNumerator,
      multiplierDenominator: segment.profile.overtimeMultiplierDenominator,
    })) as [TwoFixedOvertimeReviewSegment, TwoFixedOvertimeReviewSegment],
    canInclude,
    latestRevision: history.length,
    stale: Boolean(stale),
    latestDecision: current && !stale ? current.decision : null,
    latestThresholdMode: current && !stale ? current.thresholdMode : null,
    scope: 'EXPLICIT_TWO_FIXED_OVERTIME_POLICY_NO_PRICING',
  };
}
