import {
  validateEarningsProfile,
  type EarningsProfile,
} from './earnings-engine.ts';
import { customPayPeriodBounds } from './pay-period.ts';
import { validatePayPeriodStartDay } from './pay-period-settings.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';

/**
 * This is a READ-ONLY profile coverage / rate-transition policy preview,
 * not an earnings estimate and not an authorization to prorate fixed pay,
 * reuse monthly adjustments or apply a monthly overtime threshold.
 */
export interface CustomPayProfileSegment {
  startDate: string;
  endExclusiveDate: string;
  endDateInclusive: string;
  startInstantUtc: string;
  endInstantUtc: string;
  profile: EarningsProfile; // validated immutable latest complete snapshot
}

export type CustomPayProfilePlan =
  | {
      status: 'needs_profile';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      timeZone: string;
      segments: [];
    }
  | {
      status:
        | 'single_hourly_profile'
        | 'fixed_salary_assumption_required'
        | 'profile_transition_review_required';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      timeZone: string;
      segments: CustomPayProfileSegment[];
    };

function utcMidnight(civilDate: string, timeZone: string): string {
  const value = resolveLocalBoundary(civilDate, '00:00', timeZone, 'reject');
  if (value.status !== 'resolved') throw new Error('AMBIGUOUS_PAY_PROFILE_MIDNIGHT');
  return value.instantUtc;
}

function previousDate(exclusiveEnd: string): string {
  // The civil-date helper validates leap days, month/year carry, and range.
  const stamp = Date.parse(exclusiveEnd + 'T00:00:00.000Z');
  if (!Number.isFinite(stamp)) throw new Error('INVALID_PROFILE_SEGMENT_DATE');
  const result = new Date(stamp - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (result >= exclusiveEnd) throw new Error('INVALID_PROFILE_SEGMENT_DATE');
  return result;
}

/**
 * Every effective date is a FIRST-OF-CALENDAR-MONTH event. The 26→25
 * window can contain a 1st-of-month pay profile transition. We preserve
 * both old and new profile IDs/immutable revisions, rather than silently
 * applying the opening month's rate to the whole custom period.
 *
 * The timeZone is solely the displayed schedule-zone projection. When
 * actual work is priced, each work record's own saved IANA zone must be used.
 */
export function planCustomPayProfiles(
  periodKey: string,
  startDay: number,
  timeZone: string,
  resolvedProfiles: readonly EarningsProfile[],
): CustomPayProfilePlan {
  validatePayPeriodStartDay(startDay);
  const period = customPayPeriodBounds(periodKey, startDay);
  if (typeof timeZone !== 'string' || timeZone.length === 0)
    throw new Error('INVALID_PAY_PROFILE_TIMEZONE');

  // Validate the full source set, not just the records needed for this month:
  // corrupt historical entries should not be hidden by filtering.
  const profiles = resolvedProfiles.map(validateEarningsProfile).sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  for (let i = 1; i < profiles.length; i++) {
    if (profiles[i].effectiveFrom === profiles[i - 1].effectiveFrom)
      throw new Error('DUPLICATE_EFFECTIVE_MONTH');
  }

  const prior = profiles.filter((profile) => profile.effectiveFrom <= period.startDate);
  const active = prior[prior.length - 1];
  if (!active) {
    return {
      status: 'needs_profile',
      periodKey,
      startDay,
      startDate: period.startDate,
      endDateInclusive: period.endDateInclusive,
      timeZone,
      segments: [],
    };
  }

  const changes = profiles.filter(
    (profile) =>
      profile.effectiveFrom > period.startDate &&
      profile.effectiveFrom < period.endExclusiveDate,
  );
  const boundaries = [period.startDate, ...changes.map((entry) => entry.effectiveFrom), period.endExclusiveDate];
  const rates = [active, ...changes];

  // Resolve every boundary, including the rate transition, independently.
  // Midnight DST fold/gap must not be silently guessed.
  const stamps = boundaries.map((date) => utcMidnight(date, timeZone));
  const segments: CustomPayProfileSegment[] = [];
  for (let i = 0; i < rates.length; i++) {
    if (!(stamps[i] < stamps[i + 1]))
      throw new Error('INVALID_CUSTOM_PAY_PROFILE_SEGMENT');
    segments.push({
      startDate: boundaries[i],
      endExclusiveDate: boundaries[i + 1],
      endDateInclusive: previousDate(boundaries[i + 1]),
      startInstantUtc: stamps[i],
      endInstantUtc: stamps[i + 1],
      profile: rates[i],
    });
  }

  const status =
    segments.length > 1
      ? 'profile_transition_review_required'
      : active.model === 'monthly_fixed'
        ? 'fixed_salary_assumption_required'
        : 'single_hourly_profile';
  return {
    status,
    periodKey,
    startDay,
    startDate: period.startDate,
    endDateInclusive: period.endDateInclusive,
    timeZone,
    segments,
  };
}
