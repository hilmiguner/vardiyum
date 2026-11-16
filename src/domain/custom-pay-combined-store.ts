import {
  loadCustomAdjustmentReportFromStore,
  readCustomAdjustmentHistory,
} from './custom-adjustment-attribution-store.ts';
import {
  combineCustomPayPeriodComponents,
  type CustomPayCombinedEstimate,
} from './custom-pay-combined.ts';
import { loadCustomHourlyEstimateFromStore } from './custom-hourly-work-store.ts';
import { loadCustomFixedBaseReportFromStore } from './custom-fixed-base-store.ts';
import { loadFixedOvertimeViewFromStore } from './custom-fixed-overtime-store.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';
import type { CustomBreakSqlStore } from './custom-pay-break-store.ts';

/**
 * Caller MUST hold ONE SQLite exclusive transaction. All original work,
 * salary profile revisions, latest explicit fixed choices, hourly/fixed OT,
 * original calendar adjustments AND the latest two-period attribution events
 * are read in one coherent snapshot. No new persistence or shared global
 * mutable cache is created by this combined view.
 */
export async function loadCustomPayCombinedFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomPayCombinedEstimate> {
  const plan = await loadCustomPayProfilePreviewFromStore(store, periodKey, scheduleTimeZone);
  if (plan.startDay === 1) return { status: 'disabled', periodKey, startDay: 1 };

  const adjustments = await loadCustomAdjustmentReportFromStore(store, periodKey);
  if (adjustments.status !== 'verified' && adjustments.status !== 'empty') {
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: ['CUSTOM_COMBINED_UNATTRIBUTED_ADJUSTMENTS'],
    };
  }
  const attributions = [];
  for (const source of adjustments.candidates) {
    const history = await readCustomAdjustmentHistory(
      store,
      source.adjustmentId,
      plan.startDay,
    );
    const latest = history[history.length - 1];
    if (!latest || latest.revision !== source.revision)
      return {
        status: 'blocked',
        periodKey,
        startDay: plan.startDay,
        reasons: ['CUSTOM_COMBINED_ADJUSTMENT_AUDIT_CHANGED'],
      };
    attributions.push(latest);
  }

  const isHourly =
    plan.status === 'single_hourly_profile' ||
    (plan.status === 'profile_transition_review_required' &&
      plan.segments.every((segment) => segment.profile.model === 'hourly'));
  const isFixed = plan.status === 'fixed_salary_assumption_required';
  const hourly = isHourly
    ? await loadCustomHourlyEstimateFromStore(store, periodKey, scheduleTimeZone)
    : null;
  const fixedBase = isFixed
    ? await loadCustomFixedBaseReportFromStore(store, periodKey, scheduleTimeZone)
    : null;
  const fixedOvertime = isFixed
    ? await loadFixedOvertimeViewFromStore(store, periodKey, scheduleTimeZone)
    : null;

  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('CUSTOM_COMBINED_SETTING_CHANGED_DURING_READ');

  return combineCustomPayPeriodComponents(
    plan,
    hourly,
    fixedBase,
    fixedOvertime,
    adjustments,
    attributions,
  );
}
