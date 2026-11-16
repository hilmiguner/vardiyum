import { validateEarningsProfile, type EarningsProfile } from './earnings-engine.ts';
import {
  planCustomPayProfiles,
  type CustomPayProfilePlan,
} from './custom-pay-profile-policy.ts';
import { customPayPeriodBounds } from './pay-period.ts';

export const FIXED_TRANSITION_PREFIX = 'earnings_custom_fixed_transition_base_v1:';
export const FIXED_TRANSITION_MAX_REVISIONS = 64;
const MAX_MINOR_UNITS = 1_000_000_000_000n;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export interface FixedTransitionSegmentChoice {
  startDate: string;
  endDateInclusive: string;
  startInstantUtc: string;
  endInstantUtc: string;
  profile: EarningsProfile;
  declaredBaseMinorUnits: number;
}

/**
 * A SOURCE-BOUND user statement for two fixed monthly profile segments.
 * NOT an overtime/bonus deduction policy or an approved combined payslip.
 * No inferred day-count or work-hour proportional allocation.
 */
export interface FixedTransitionBaseEvent {
  schema: 1;
  source: 'user_entered';
  periodKey: string;
  startDay: number;
  startDate: string;
  endDateInclusive: string;
  scheduleTimeZone: string;
  segments: [FixedTransitionSegmentChoice, FixedTransitionSegmentChoice];
  currency: string;
  declaredBaseTotalMinorUnits: number;
  revision: number;
  reason: string;
  recordedAt: string;
}

export function fixedTransitionPrefix(periodKey: string, day: number): string {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_FIXED_TRANSITION_PERIOD');
  if (!Number.isSafeInteger(day) || day < 2 || day > 28)
    throw new Error('INVALID_FIXED_TRANSITION_START_DAY');
  customPayPeriodBounds(periodKey, day);
  return FIXED_TRANSITION_PREFIX + day + ':' + periodKey + ':';
}

export function fixedTransitionHeadKey(periodKey: string, day: number): string {
  return fixedTransitionPrefix(periodKey, day) + 'head';
}

export function fixedTransitionEventKey(periodKey: string, day: number, revision: number): string {
  if (!Number.isSafeInteger(revision) || revision < 1 ||
    revision > FIXED_TRANSITION_MAX_REVISIONS)
    throw new Error('FIXED_TRANSITION_REVISION_LIMIT');
  return fixedTransitionPrefix(periodKey, day) + 'event:' +
    String(revision).padStart(3, '0');
}

export function eligibleFixedTransition(plan: CustomPayProfilePlan): [
  CustomPayProfilePlan['segments'][number],
  CustomPayProfilePlan['segments'][number],
] {
  fixedTransitionPrefix(plan.periodKey, plan.startDay);
  if (plan.status !== 'profile_transition_review_required' ||
    plan.segments.length !== 2)
    throw new Error('FIXED_TRANSITION_TWO_PROFILES_REQUIRED');
  const [first, second] = plan.segments;
  const a = validateEarningsProfile(first.profile);
  const b = validateEarningsProfile(second.profile);
  if (a.model !== 'monthly_fixed' || b.model !== 'monthly_fixed')
    throw new Error('FIXED_TRANSITION_MODEL_NOT_SUPPORTED');
  if (a.currency !== b.currency) throw new Error('FIXED_TRANSITION_CURRENCY_NO_FX');
  const bounds = customPayPeriodBounds(plan.periodKey, plan.startDay);
  if (
    first.startDate !== bounds.startDate ||
    second.endExclusiveDate !== bounds.endExclusiveDate ||
    first.endExclusiveDate !== second.startDate ||
    first.endInstantUtc !== second.startInstantUtc ||
    a.effectiveFrom > first.startDate ||
    b.effectiveFrom !== second.startDate ||
    first.startInstantUtc >= first.endInstantUtc ||
    second.startInstantUtc >= second.endInstantUtc
  ) throw new Error('FIXED_TRANSITION_SEGMENT_COVERAGE_INVALID');

  const canonical = planCustomPayProfiles(plan.periodKey, plan.startDay, plan.timeZone, [a, b]);
  if (JSON.stringify(canonical) !== JSON.stringify(plan))
    throw new Error('FIXED_TRANSITION_PROFILE_PLAN_CHANGED');
  return [first, second];
}

function timestamp(value: string): void {
  if (typeof value !== 'string' || !UTC.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value)
    throw new Error('INVALID_FIXED_TRANSITION_TIMESTAMP');
}

/** Each explicit segment allocation is 0..its own immutable full monthly base. */
export function createFixedTransitionBaseEvent(
  plan: CustomPayProfilePlan,
  declared: readonly [number, number],
  revision: number,
  reason: string,
  recordedAt: string,
): FixedTransitionBaseEvent {
  fixedTransitionEventKey(plan.periodKey, plan.startDay, revision);
  const segments = eligibleFixedTransition(plan);
  if (!Array.isArray(declared) || declared.length !== 2)
    throw new Error('FIXED_TRANSITION_TWO_AMOUNTS_REQUIRED');
  const amounts = declared.map((amount, index) => {
    const limit = segments[index].profile.baseMinorUnits;
    if (!Number.isSafeInteger(amount) || amount < 0 ||
      amount > limit || BigInt(amount) > MAX_MINOR_UNITS)
      throw new Error('INVALID_FIXED_TRANSITION_SEGMENT_AMOUNT');
    return amount;
  }) as [number, number];
  const total = BigInt(amounts[0]) + BigInt(amounts[1]);
  if (total > MAX_MINOR_UNITS) throw new Error('FIXED_TRANSITION_MONEY_OVERFLOW');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_FIXED_TRANSITION_REASON');
  timestamp(recordedAt);

  return {
    schema: 1,
    source: 'user_entered',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    startDate: plan.startDate,
    endDateInclusive: plan.endDateInclusive,
    scheduleTimeZone: plan.timeZone,
    segments: segments.map((segment, index) => ({
      startDate: segment.startDate,
      endDateInclusive: segment.endDateInclusive,
      startInstantUtc: segment.startInstantUtc,
      endInstantUtc: segment.endInstantUtc,
      profile: segment.profile,
      declaredBaseMinorUnits: amounts[index],
    })) as [FixedTransitionSegmentChoice, FixedTransitionSegmentChoice],
    currency: segments[0].profile.currency,
    declaredBaseTotalMinorUnits: Number(total),
    revision,
    reason: reason.trim(),
    recordedAt,
  };
}

/**
 * Each historical revision is independently validated against its saved
 * source profile snapshots. A later profile correction makes today's
 * amount stale but never alters historical events.
 */
export function decodeFixedTransitionHistory(
  periodKey: string,
  day: number,
  rows: readonly { key: string; value: string }[],
): FixedTransitionBaseEvent[] {
  const prefix = fixedTransitionPrefix(periodKey, day);
  if (!Array.isArray(rows)) throw new Error('INVALID_FIXED_TRANSITION_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > FIXED_TRANSITION_MAX_REVISIONS + 1)
    throw new Error('FIXED_TRANSITION_REVISION_LIMIT');
  const heads = rows.filter((row) => row.key === prefix + 'head');
  const events = rows.filter((row) => row.key !== prefix + 'head');
  if (
    heads.length !== 1 ||
    !/^[1-9][0-9]*$/.test(heads[0].value) ||
    Number(heads[0].value) !== events.length ||
    events.length === 0
  ) throw new Error('INVALID_FIXED_TRANSITION_HEAD');

  const history: FixedTransitionBaseEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const row = events[index];
    const revision = index + 1;
    if (row.key !== fixedTransitionEventKey(periodKey, day, revision))
      throw new Error('FIXED_TRANSITION_EVENT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 4500)
      throw new Error('INVALID_FIXED_TRANSITION_EVENT');
    let event: FixedTransitionBaseEvent;
    try {
      event = JSON.parse(row.value) as FixedTransitionBaseEvent;
      if (!event || typeof event !== 'object' || Array.isArray(event) ||
        !Array.isArray(event.segments) || event.segments.length !== 2)
        throw new Error('INVALID_FIXED_TRANSITION_EVENT');
      const plan = planCustomPayProfiles(periodKey, day, event.scheduleTimeZone, [
        event.segments[0].profile, event.segments[1].profile,
      ]);
      const canonical = createFixedTransitionBaseEvent(
        plan,
        [event.segments[0].declaredBaseMinorUnits,
          event.segments[1].declaredBaseMinorUnits],
        revision,
        event.reason,
        event.recordedAt,
      );
      if (row.value !== JSON.stringify(canonical))
        throw new Error('INVALID_FIXED_TRANSITION_EVENT');
      const previous = history[history.length - 1];
      if (previous &&
        (canonical.recordedAt < previous.recordedAt ||
          (canonical.scheduleTimeZone === previous.scheduleTimeZone &&
            JSON.stringify(canonical.segments) === JSON.stringify(previous.segments))))
        throw new Error('INVALID_FIXED_TRANSITION_REVISION');
      history.push(canonical);
    } catch {
      throw new Error('INVALID_FIXED_TRANSITION_EVENT');
    }
  }
  return history;
}

export function fixedTransitionMatchesPlan(
  plan: CustomPayProfilePlan,
  event: FixedTransitionBaseEvent,
): boolean {
  try {
    const segments = eligibleFixedTransition(plan);
    const canonical = createFixedTransitionBaseEvent(
      plan,
      [event.segments[0].declaredBaseMinorUnits, event.segments[1].declaredBaseMinorUnits],
      event.revision,
      event.reason,
      event.recordedAt,
    );
    return event.scheduleTimeZone === plan.timeZone &&
      event.currency === segments[0].profile.currency &&
      JSON.stringify(canonical) === JSON.stringify(event);
  } catch {
    return false;
  }
}
