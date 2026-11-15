import {
  createCustomFixedBaseEvent,
  decodeCustomFixedBaseHistory,
  eligibleFixedBaseProfile,
  fixedBaseChoiceMatchesPlan,
  fixedBaseEventKey,
  fixedBaseHeadKey,
  fixedBasePrefix,
  type CustomFixedBaseChoice,
  type CustomFixedBaseEvent,
} from './custom-fixed-base-policy.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import type { CustomBreakSqlStore } from './custom-pay-break-store.ts';
import { customPayPeriodBounds } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

export interface CustomFixedBaseSave {
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  choice: CustomFixedBaseChoice;
  partialBaseMinorUnits: number | null;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

export type CustomFixedBaseReport =
  | { status: 'not_applicable'; periodKey: string; startDay: number }
  | {
      status: 'blocked';
      periodKey: string;
      startDay: number;
      reasons: string[];
      latestRevision: number;
    }
  | {
      status: 'requires_choice';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      currency: string;
      profileId: string;
      profileRevision: number;
      fullBaseMinorUnits: number;
      latestRevision: number;
      stale: boolean;
      latestChoice: CustomFixedBaseChoice | null;
      latestPartialMinorUnits: number | null;
    }
  | {
      status: 'estimated';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      currency: string;
      profileId: string;
      profileRevision: number;
      fullBaseMinorUnits: number;
      latestRevision: number;
      choice: CustomFixedBaseChoice;
      baseOnlyMinorUnits: number;
      scope: 'BASE_ONLY_OVERTIME_WORK_ADJUSTMENTS_EXCLUDED';
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    };

export async function readCustomFixedBaseHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  periodKey: string,
  startDay: number,
): Promise<CustomFixedBaseEvent[]> {
  const prefix = fixedBasePrefix(periodKey, startDay);
  const rows = await store.getAllAsync<{key: string; value: string}>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length, prefix,
  );
  return decodeCustomFixedBaseHistory(periodKey, startDay, rows);
}

/**
 * Caller MUST hold SQLite withExclusiveTransactionAsync. Every accepted
 * correction inserts a new immutable event and atomically advances head.
 * No underlying profile or adjustment is modified.
 */
export async function appendCustomFixedBaseRevision(
  store: CustomBreakSqlStore,
  input: CustomFixedBaseSave,
): Promise<CustomFixedBaseEvent> {
  fixedBasePrefix(input.periodKey, input.startDay);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision >= 64
  ) throw new Error('INVALID_FIXED_BASE_EXPECTED_REVISION');
  const plan = await loadCustomPayProfilePreviewFromStore(
    store, input.periodKey, input.scheduleTimeZone,
  );
  if (plan.startDay !== input.startDay) throw new Error('FIXED_BASE_SETTING_CHANGED');
  eligibleFixedBaseProfile(plan);
  const history = await readCustomFixedBaseHistory(store, input.periodKey, input.startDay);
  if (history.length !== input.expectedRevision)
    throw new Error('STALE_FIXED_BASE_REVISION');

  const event = createCustomFixedBaseEvent(
    plan, input.choice, input.partialBaseMinorUnits, history.length + 1,
    input.reason, input.recordedAt,
  );
  if (history.length) {
    const latest = history[history.length - 1];
    if (
      latest.choice === event.choice &&
      latest.chosenBaseMinorUnits === event.chosenBaseMinorUnits &&
      latest.scheduleTimeZone === event.scheduleTimeZone &&
      JSON.stringify(latest.profile) === JSON.stringify(event.profile)
    ) throw new Error('UNCHANGED_FIXED_BASE_CHOICE');
    if (event.recordedAt < latest.recordedAt)
      throw new Error('INVALID_FIXED_BASE_REVISION');
  }

  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    fixedBaseEventKey(input.periodKey, input.startDay, event.revision),
    JSON.stringify(event),
  );
  const head = fixedBaseHeadKey(input.periodKey, input.startDay);
  if (history.length === 0) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const updated = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision), head, String(history.length),
    );
    if (updated.changes !== 1) throw new Error('STALE_FIXED_BASE_REVISION');
  }
  const readback = await readCustomFixedBaseHistory(store, input.periodKey, input.startDay);
  if (
    readback.length !== event.revision ||
    JSON.stringify(readback[readback.length - 1]) !== JSON.stringify(event)
  ) throw new Error('FIXED_BASE_READBACK_MISMATCH');
  return event;
}

/**
 * Base-only: no prorating, no inference from actual-work hours. Even an
 * explicitly saved choice never takes existing calendar month bonuses,
 * deductions or corrections into a custom payroll period implicitly.
 */
export async function loadCustomFixedBaseReportFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomFixedBaseReport> {
  const plan = await loadCustomPayProfilePreviewFromStore(
    store, periodKey, scheduleTimeZone,
  );
  if (plan.startDay === 1 || plan.status === 'single_hourly_profile' ||
    (plan.status === 'profile_transition_review_required' &&
      plan.segments.every(segment => segment.profile.model === 'hourly')))
    return { status: 'not_applicable', periodKey, startDay: plan.startDay };
  if (plan.status === 'needs_profile')
    return {
      status: 'blocked', periodKey, startDay: plan.startDay,
      latestRevision: 0, reasons: ['CUSTOM_FIXED_OPENING_PROFILE_REQUIRED'],
    };
  if (plan.status !== 'fixed_salary_assumption_required')
    return {
      status: 'blocked', periodKey, startDay: plan.startDay,
      latestRevision: 0, reasons: ['CUSTOM_FIXED_MIXED_PROFILE_POLICY_REQUIRED'],
    };
  let profile;
  try {
    profile = eligibleFixedBaseProfile(plan);
  } catch (error) {
    return {
      status: 'blocked', periodKey, startDay: plan.startDay, latestRevision: 0,
      reasons: [error instanceof Error ? error.message : 'INVALID_FIXED_BASE_PROFILE'],
    };
  }
  const history = await readCustomFixedBaseHistory(store, periodKey, plan.startDay);
  const latest = history[history.length - 1];
  const stale = latest ? !fixedBaseChoiceMatchesPlan(plan, latest) : false;
  const bounds = customPayPeriodBounds(periodKey, plan.startDay);
  const adjustments = await store.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM earnings_adjustments WHERE period_key IN (?,?)',
    bounds.startDate.slice(0,7), bounds.endDateInclusive.slice(0,7),
  );
  if (!adjustments || !Number.isSafeInteger(adjustments.n) || adjustments.n < 0)
    return {
      status: 'blocked', periodKey, startDay: plan.startDay,
      latestRevision: history.length, reasons: ['INVALID_FIXED_BASE_ADJUSTMENT_SOURCE'],
    };
  if (adjustments.n > 0)
    return {
      status: 'blocked', periodKey, startDay: plan.startDay,
      latestRevision: history.length,
      reasons: ['CUSTOM_FIXED_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION'],
    };
  if (!latest || stale) {
    return {
      status: 'requires_choice',
      periodKey,
      startDay: plan.startDay,
      startDate: bounds.startDate,
      endDateInclusive: bounds.endDateInclusive,
      currency: profile.currency,
      profileId: profile.id,
      profileRevision: profile.revision,
      fullBaseMinorUnits: profile.baseMinorUnits,
      latestRevision: history.length,
      stale,
      latestChoice: stale ? null : latest?.choice ?? null,
      latestPartialMinorUnits: null,
    };
  }
  // Latest must be canonical, validated by the entire history and bound to the
  // exact current profile. Do not confuse this with a complete wage estimate.
  const current = createCustomFixedBaseEvent(
    plan, latest.choice,
    latest.choice === 'full_base' ? null : latest.chosenBaseMinorUnits,
    latest.revision, latest.reason, latest.recordedAt,
  );
  if (JSON.stringify(current) !== JSON.stringify(latest))
    return {
      status: 'blocked', periodKey, startDay: plan.startDay,
      latestRevision: history.length, reasons: ['INVALID_FIXED_BASE_CHOICE_SOURCE'],
    };
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('FIXED_BASE_SETTING_CHANGED_DURING_REPORT');
  return {
    status: 'estimated',
    periodKey, startDay: plan.startDay,
    startDate: bounds.startDate, endDateInclusive: bounds.endDateInclusive,
    currency: profile.currency, profileId: profile.id, profileRevision: profile.revision,
    fullBaseMinorUnits: profile.baseMinorUnits,
    latestRevision: latest.revision, choice: latest.choice,
    baseOnlyMinorUnits: latest.chosenBaseMinorUnits,
    scope: 'BASE_ONLY_OVERTIME_WORK_ADJUSTMENTS_EXCLUDED',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}
