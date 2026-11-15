import {
  createFixedOvertimeEvent,
  decodeFixedOvertimeHistory,
  fixedOvertimeEventKey,
  fixedOvertimeHeadKey,
  fixedOvertimePrefix,
  validateFixedOvertimeProfile,
  type FixedOvertimeDecision,
  type FixedOvertimeEvent,
} from './custom-fixed-overtime-policy.ts';
import {
  loadCustomFixedBaseReportFromStore,
  readCustomFixedBaseHistory,
} from './custom-fixed-base-store.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import {
  CUSTOM_BREAK_WORK_SQL,
  readCustomPayBreakHistory,
  workFromCustomBreakRow,
  type CustomBreakSqlStore,
  type CustomBreakWorkRow,
} from './custom-pay-break-store.ts';
import {
  estimateCustomFixedOvertime,
  type FixedOvertimeEstimate,
  type FixedOvertimeWorkSource,
} from './custom-fixed-overtime-engine.ts';
import { eligibleFixedBaseProfile } from './custom-fixed-base-policy.ts';
import { validateEarningsWork } from './earnings-engine.ts';
import { customPayPeriodBounds, payPeriodForDate } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';
import { calendarDateInZone } from './shift-engine.ts';

export interface FixedOvertimeSave {
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  decision: FixedOvertimeDecision;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

export type FixedOvertimeView =
  | {
      status: 'not_applicable' | 'requires_base' | 'needs_configuration' | 'blocked';
      periodKey: string;
      startDay: number;
      reasons: string[];
    }
  | {
      status: 'review';
      periodKey: string;
      startDay: number;
      currency: string;
      profileId: string;
      profileRevision: number;
      baseRevision: number;
      baseMinorUnits: number;
      thresholdMinutes: number;
      overtimeHourlyMinorUnits: number;
      multiplierNumerator: number;
      multiplierDenominator: number;
      latestRevision: number;
      latestDecision: FixedOvertimeDecision | null;
      stale: boolean;
      estimate: FixedOvertimeEstimate;
    };

export async function readFixedOvertimeHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  periodKey: string,
  startDay: number,
): Promise<FixedOvertimeEvent[]> {
  const prefix = fixedOvertimePrefix(periodKey, startDay);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length,
    prefix,
  );
  return decodeFixedOvertimeHistory(periodKey, startDay, rows);
}

/** Caller MUST provide an exclusive transaction: insert-once event and CAS head. */
export async function appendFixedOvertimeRevision(
  store: CustomBreakSqlStore,
  input: FixedOvertimeSave,
): Promise<FixedOvertimeEvent> {
  fixedOvertimePrefix(input.periodKey, input.startDay);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= 64
  )
    throw new Error('INVALID_FIXED_OVERTIME_EXPECTED_REVISION');
  const plan = await loadCustomPayProfilePreviewFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('FIXED_OVERTIME_SETTING_CHANGED');
  validateFixedOvertimeProfile(plan);
  const baseReport = await loadCustomFixedBaseReportFromStore(
    store,
    input.periodKey,
    input.scheduleTimeZone,
  );
  if (baseReport.status !== 'estimated') throw new Error('FIXED_OVERTIME_BASE_CHOICE_REQUIRED');
  const baseHistory = await readCustomFixedBaseHistory(store, input.periodKey, input.startDay);
  const base = baseHistory[baseHistory.length - 1];
  if (
    !base ||
    base.revision !== baseReport.latestRevision ||
    base.chosenBaseMinorUnits !== baseReport.baseOnlyMinorUnits
  )
    throw new Error('FIXED_OVERTIME_BASE_READBACK_MISMATCH');

  const history = await readFixedOvertimeHistory(store, input.periodKey, input.startDay);
  if (history.length !== input.expectedRevision)
    throw new Error('STALE_FIXED_OVERTIME_REVISION');
  const event = createFixedOvertimeEvent(
    plan,
    base,
    input.decision,
    history.length + 1,
    input.reason,
    input.recordedAt,
  );
  if (history.length) {
    const previous = history[history.length - 1];
    if (
      previous.decision === event.decision &&
      JSON.stringify(previous.fixedBase) === JSON.stringify(event.fixedBase)
    )
      throw new Error('UNCHANGED_FIXED_OVERTIME_DECISION');
    if (event.recordedAt < previous.recordedAt)
      throw new Error('INVALID_FIXED_OVERTIME_REVISION');
  }
  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    fixedOvertimeEventKey(input.periodKey, input.startDay, event.revision),
    JSON.stringify(event),
  );
  const head = fixedOvertimeHeadKey(input.periodKey, input.startDay);
  if (history.length === 0) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const updated = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision),
      head,
      String(history.length),
    );
    if (updated.changes !== 1) throw new Error('STALE_FIXED_OVERTIME_REVISION');
  }
  const verify = await readFixedOvertimeHistory(store, input.periodKey, input.startDay);
  if (
    verify.length !== event.revision ||
    JSON.stringify(verify[verify.length - 1]) !== JSON.stringify(event)
  )
    throw new Error('FIXED_OVERTIME_READBACK_MISMATCH');
  return event;
}

/**
 * All reads must use ONE exclusive SQLite transaction. The source selector is
 * limited to potentially overlapping civil dates, but every work's SAVED IANA
 * zone and UTC interval (not the phone/schedule zone) control the real split.
 */
export async function loadFixedOvertimeViewFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<FixedOvertimeView> {
  const plan = await loadCustomPayProfilePreviewFromStore(store, periodKey, scheduleTimeZone);
  if (
    plan.startDay === 1 ||
    plan.status === 'single_hourly_profile' ||
    (plan.status === 'profile_transition_review_required' &&
      plan.segments.every((segment) => segment.profile.model === 'hourly'))
  )
    return { status: 'not_applicable', periodKey, startDay: plan.startDay, reasons: [] };
  const baseReport = await loadCustomFixedBaseReportFromStore(
    store,
    periodKey,
    scheduleTimeZone,
  );
  if (baseReport.status === 'blocked')
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: baseReport.reasons,
    };
  if (baseReport.status !== 'estimated')
    return {
      status: 'requires_base',
      periodKey,
      startDay: plan.startDay,
      reasons: ['CUSTOM_FIXED_BASE_CHOICE_REQUIRED'],
    };

  const profile = eligibleFixedBaseProfile(plan);
  try {
    validateFixedOvertimeProfile(plan);
  } catch (error) {
    return {
      status: 'needs_configuration',
      periodKey,
      startDay: plan.startDay,
      reasons: [
        error instanceof Error ? error.message : 'CUSTOM_FIXED_OVERTIME_NOT_CONFIGURED',
      ],
    };
  }
  const baseHistory = await readCustomFixedBaseHistory(store, periodKey, plan.startDay);
  const base = baseHistory[baseHistory.length - 1];
  if (
    !base ||
    base.revision !== baseReport.latestRevision ||
    base.chosenBaseMinorUnits !== baseReport.baseOnlyMinorUnits
  )
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: ['FIXED_OVERTIME_BASE_READBACK_MISMATCH'],
    };
  const history = await readFixedOvertimeHistory(store, periodKey, plan.startDay);
  const current = history[history.length - 1] ?? null;
  const stale = current !== null && JSON.stringify(current.fixedBase) !== JSON.stringify(base);
  const bounds = customPayPeriodBounds(periodKey, plan.startDay);
  const adjustments = await store.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM earnings_adjustments WHERE period_key IN (?,?)',
    bounds.startDate.slice(0, 7),
    bounds.endDateInclusive.slice(0, 7),
  );
  if (!adjustments || !Number.isSafeInteger(adjustments.n) || adjustments.n !== 0)
    return {
      status: 'blocked',
      periodKey,
      startDay: plan.startDay,
      reasons: ['CUSTOM_FIXED_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION'],
    };

  const sources: FixedOvertimeWorkSource[] = [];
  if (current?.decision === 'include_logged_overtime' && !stale) {
    const rows = await store.getAllAsync<CustomBreakWorkRow>(
      CUSTOM_BREAK_WORK_SQL +
        ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
      bounds.endDateInclusive,
      bounds.startDate,
    );
    for (const row of rows) {
      const work = validateEarningsWork(workFromCustomBreakRow(row));
      const first = calendarDateInZone(work.timeZone, new Date(work.startInstantUtc));
      const last = calendarDateInZone(
        work.timeZone,
        new Date(Date.parse(work.endInstantUtc) - 1),
      );
      if (
        payPeriodForDate(first, plan.startDay) !== payPeriodForDate(last, plan.startDay) &&
        work.breakMinutes > 0
      ) {
        const breakHistory = await readCustomPayBreakHistory(store, work, plan.startDay);
        sources.push({ work, periodAudit: breakHistory[breakHistory.length - 1] });
      } else {
        sources.push({ work });
      }
    }
  }
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('FIXED_OVERTIME_SETTING_CHANGED_DURING_REPORT');
  const estimate = estimateCustomFixedOvertime(plan, base, current, sources, adjustments.n);
  return {
    status: 'review',
    periodKey,
    startDay: plan.startDay,
    currency: profile.currency,
    profileId: profile.id,
    profileRevision: profile.revision,
    baseRevision: base.revision,
    baseMinorUnits: base.chosenBaseMinorUnits,
    thresholdMinutes: profile.overtimeAfterMinutes!,
    overtimeHourlyMinorUnits: profile.overtimeHourlyMinorUnits,
    multiplierNumerator: profile.overtimeMultiplierNumerator,
    multiplierDenominator: profile.overtimeMultiplierDenominator,
    latestRevision: history.length,
    latestDecision: stale ? null : (current?.decision ?? null),
    stale,
    estimate,
  };
}
