import { validateEarningsProfile, type EarningsProfile } from './earnings-engine.ts';
import {
  planCustomPayProfiles,
  type CustomPayProfilePlan,
} from './custom-pay-profile-policy.ts';
import { customPayPeriodBounds } from './pay-period.ts';

export const CUSTOM_FIXED_BASE_PREFIX = 'earnings_custom_fixed_base_v1:';
export const CUSTOM_FIXED_BASE_MAX_REVISIONS = 64;

export type CustomFixedBaseChoice = 'full_base' | 'explicit_partial_base';

/**
 * A user-declared base amount for one custom payroll period, NEVER an inferred
 * calendar-day/hour fraction, never a payslip or a promise of net earnings.
 * Overtime, adjustments, taxes and logged actual work are NOT included.
 */
export interface CustomFixedBaseEvent {
  schema: 1;
  source: 'user_entered';
  periodKey: string;
  startDay: number;
  startDate: string;
  endDateInclusive: string;
  scheduleTimeZone: string;
  profile: EarningsProfile;
  choice: CustomFixedBaseChoice;
  chosenBaseMinorUnits: number;
  revision: number;
  reason: string;
  recordedAt: string;
}

const PERIOD = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;
const MAX_MONEY = 1_000_000_000_000;

export function fixedBasePrefix(periodKey: string, startDay: number): string {
  if (!PERIOD.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_FIXED_BASE_PERIOD');
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('INVALID_FIXED_BASE_START_DAY');
  customPayPeriodBounds(periodKey, startDay);
  return CUSTOM_FIXED_BASE_PREFIX + startDay + ':' + periodKey + ':';
}

export function fixedBaseHeadKey(periodKey: string, startDay: number): string {
  return fixedBasePrefix(periodKey, startDay) + 'head';
}

export function fixedBaseEventKey(
  periodKey: string,
  startDay: number,
  revision: number,
): string {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    revision > CUSTOM_FIXED_BASE_MAX_REVISIONS
  )
    throw new Error('FIXED_BASE_REVISION_LIMIT');
  return fixedBasePrefix(periodKey, startDay) + 'event:' + String(revision).padStart(3, '0');
}

export function eligibleFixedBaseProfile(plan: CustomPayProfilePlan): EarningsProfile {
  fixedBasePrefix(plan.periodKey, plan.startDay);
  if (plan.status !== 'fixed_salary_assumption_required' || plan.segments.length !== 1)
    throw new Error('FIXED_BASE_SINGLE_PROFILE_REQUIRED');
  const bounds = customPayPeriodBounds(plan.periodKey, plan.startDay);
  const segment = plan.segments[0];
  const profile = validateEarningsProfile(segment.profile);
  if (
    plan.startDate !== bounds.startDate ||
    plan.endDateInclusive !== bounds.endDateInclusive ||
    segment.startDate !== bounds.startDate ||
    segment.endExclusiveDate !== bounds.endExclusiveDate ||
    segment.endDateInclusive !== bounds.endDateInclusive ||
    profile.model !== 'monthly_fixed' ||
    profile.effectiveFrom > bounds.startDate
  )
    throw new Error('FIXED_BASE_PROFILE_COVERAGE_MISMATCH');

  // The profile plan must not have lost a source transition or changed
  // time-zone boundary between the app's display and saved declaration.
  const canonical = planCustomPayProfiles(plan.periodKey, plan.startDay, plan.timeZone, [
    profile,
  ]);
  if (JSON.stringify(canonical) !== JSON.stringify(plan))
    throw new Error('FIXED_BASE_PROFILE_PLAN_CHANGED');
  return profile;
}

export function createCustomFixedBaseEvent(
  plan: CustomPayProfilePlan,
  choice: CustomFixedBaseChoice,
  partialBaseMinorUnits: number | null,
  revision: number,
  reason: string,
  recordedAt: string,
): CustomFixedBaseEvent {
  const profile = eligibleFixedBaseProfile(plan);
  fixedBaseEventKey(plan.periodKey, plan.startDay, revision);
  if (choice !== 'full_base' && choice !== 'explicit_partial_base')
    throw new Error('INVALID_FIXED_BASE_CHOICE');
  let amount: number;
  if (choice === 'full_base') {
    if (partialBaseMinorUnits !== null)
      throw new Error('FIXED_BASE_FULL_CANNOT_OVERRIDE_AMOUNT');
    amount = profile.baseMinorUnits;
  } else {
    if (
      !Number.isSafeInteger(partialBaseMinorUnits) ||
      (partialBaseMinorUnits as number) < 0 ||
      (partialBaseMinorUnits as number) >= profile.baseMinorUnits
    )
      throw new Error('INVALID_FIXED_BASE_PARTIAL_AMOUNT');
    amount = partialBaseMinorUnits as number;
  }
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_MONEY)
    throw new Error('INVALID_FIXED_BASE_AMOUNT');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_FIXED_BASE_REASON');
  if (typeof recordedAt !== 'string' || !UTC.test(recordedAt))
    throw new Error('INVALID_FIXED_BASE_TIMESTAMP');
  const stamp = Date.parse(recordedAt);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== recordedAt)
    throw new Error('INVALID_FIXED_BASE_TIMESTAMP');

  return {
    schema: 1,
    source: 'user_entered',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    startDate: plan.startDate,
    endDateInclusive: plan.endDateInclusive,
    scheduleTimeZone: plan.timeZone,
    profile,
    choice,
    chosenBaseMinorUnits: amount,
    revision,
    reason: reason.trim(),
    recordedAt,
  };
}

/**
 * Historical events are validated against their OWN historical profile
 * snapshots. Profile corrections never rewrite old user statements. An
 * estimate is shown only if the latest snapshot matches today's profile.
 * This is app-level append-only, NOT cryptographically tamper-proof storage.
 */
export function decodeCustomFixedBaseHistory(
  periodKey: string,
  startDay: number,
  rows: readonly { key: string; value: string }[],
): CustomFixedBaseEvent[] {
  const prefix = fixedBasePrefix(periodKey, startDay);
  if (!Array.isArray(rows)) throw new Error('INVALID_FIXED_BASE_HISTORY');
  if (!rows.length) return [];
  if (rows.length > CUSTOM_FIXED_BASE_MAX_REVISIONS + 1)
    throw new Error('FIXED_BASE_REVISION_LIMIT');
  const heads = rows.filter((item) => item.key === prefix + 'head');
  const events = rows.filter((item) => item.key !== prefix + 'head');
  if (
    heads.length !== 1 ||
    !/^[1-9][0-9]*$/.test(heads[0].value) ||
    Number(heads[0].value) !== events.length ||
    events.length === 0
  )
    throw new Error('INVALID_FIXED_BASE_HEAD');
  const history: CustomFixedBaseEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const row = events[i];
    const revision = i + 1;
    if (row.key !== fixedBaseEventKey(periodKey, startDay, revision))
      throw new Error('FIXED_BASE_EVENT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 1700)
      throw new Error('INVALID_FIXED_BASE_EVENT');
    let item: CustomFixedBaseEvent;
    try {
      item = JSON.parse(row.value) as CustomFixedBaseEvent;
    } catch {
      throw new Error('INVALID_FIXED_BASE_EVENT');
    }
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('INVALID_FIXED_BASE_EVENT');
    let canonical: CustomFixedBaseEvent;
    try {
      const historical = planCustomPayProfiles(periodKey, startDay, item.scheduleTimeZone, [
        item.profile,
      ]);
      canonical = createCustomFixedBaseEvent(
        historical,
        item.choice,
        item.choice === 'full_base' ? null : item.chosenBaseMinorUnits,
        revision,
        item.reason,
        item.recordedAt,
      );
    } catch {
      throw new Error('INVALID_FIXED_BASE_EVENT');
    }
    if (JSON.stringify(canonical) !== row.value) throw new Error('INVALID_FIXED_BASE_EVENT');
    if (
      history.length &&
      (canonical.recordedAt < history[history.length - 1].recordedAt ||
        (canonical.choice === history[history.length - 1].choice &&
          canonical.chosenBaseMinorUnits === history[history.length - 1].chosenBaseMinorUnits &&
          JSON.stringify(canonical.profile) ===
            JSON.stringify(history[history.length - 1].profile) &&
          canonical.scheduleTimeZone === history[history.length - 1].scheduleTimeZone))
    )
      throw new Error('INVALID_FIXED_BASE_REVISION');
    history.push(canonical);
  }
  return history;
}

export function fixedBaseChoiceMatchesPlan(
  plan: CustomPayProfilePlan,
  event: CustomFixedBaseEvent,
): boolean {
  const profile = eligibleFixedBaseProfile(plan);
  return (
    event.periodKey === plan.periodKey &&
    event.startDay === plan.startDay &&
    event.startDate === plan.startDate &&
    event.endDateInclusive === plan.endDateInclusive &&
    event.scheduleTimeZone === plan.timeZone &&
    JSON.stringify(event.profile) === JSON.stringify(profile)
  );
}
