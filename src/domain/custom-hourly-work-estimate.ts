import { estimateCustomMixedHourlyWork } from './custom-mixed-hourly-work.ts';
import {
  roundRational,
  validateEarningsProfile,
  validateEarningsWork,
  type EarningsProfile,
  type EarningsWork,
} from './earnings-engine.ts';
import type { CustomPayProfilePlan } from './custom-pay-profile-policy.ts';
import {
  customPayPeriodBounds,
  splitWorkForPayPeriod,
  type PayPeriodBreakAllocation,
  type PayPeriodWorkPortion,
} from './pay-period.ts';

/**
 * STRICTLY a user-reported actual-work HOURLY estimate. It excludes calendar
 * adjustments, salary base, tax, SGK, employer approval and future shifts.
 * A real custom-period mixed-rate/fixed-pay policy is not yet authorized.
 */
export interface CustomHourlySource {
  work: EarningsWork;
  allocation?: PayPeriodBreakAllocation;
  auditRevision?: number;
}

export interface CustomHourlyLine {
  workId: string;
  kind: 'regular' | 'overtime';
  sourceStartUtc: string;
  sourceEndUtc: string;
  segmentStartUtc: string;
  segmentEndUtc: string;
  timeZone: string;
  sourceBreakMinutes: number;
  breakAuditRevision: number | null;
  seconds: number;
  amountMinorUnits: number;
  profileId: string;
  profileRevision: number;
}

export type CustomHourlyEstimate =
  | {
      status: 'disabled' | 'needs_profile' | 'blocked' | 'no_work';
      periodKey: string;
      startDay: number;
      reasons: string[];
    }
  | {
      status: 'estimated';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      currency: string;
      profileId: string | null;
      profileRevision: number | null;
      profileCount: number;
      regularSeconds: number;
      overtimeSeconds: number;
      loggedSeconds: number;
      workOnlyMinorUnits: number;
      lines: CustomHourlyLine[];
      scope: 'ACTUAL_WORK_ONLY_NO_ADJUSTMENTS';
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    };

const MAX_MINOR_UNITS = 1_000_000_000_000n;

function result(
  status: 'disabled' | 'needs_profile' | 'blocked' | 'no_work',
  periodKey: string,
  startDay: number,
  reasons: string[],
): CustomHourlyEstimate {
  return { status, periodKey, startDay, reasons };
}

function validateSingleRatePlan(plan: CustomPayProfilePlan): EarningsProfile {
  if (plan.status !== 'single_hourly_profile' || plan.segments.length !== 1)
    throw new Error('CUSTOM_PAY_PROFILE_REVIEW_REQUIRED');
  const period = customPayPeriodBounds(plan.periodKey, plan.startDay);
  const segment = plan.segments[0];
  const profile = validateEarningsProfile(segment.profile);
  if (
    plan.startDate !== period.startDate ||
    plan.endDateInclusive !== period.endDateInclusive ||
    segment.startDate !== period.startDate ||
    segment.endExclusiveDate !== period.endExclusiveDate ||
    segment.endDateInclusive !== period.endDateInclusive ||
    profile.model !== 'hourly' ||
    profile.effectiveFrom > period.startDate
  ) {
    throw new Error('CUSTOM_PAY_PROFILE_COVERAGE_MISMATCH');
  }
  return profile;
}

/**
 * Rounding is cumulative within each pay category: line deltas telescope to
 * roundRational(total seconds * rate). A threshold can split one source
 * session, but a source is never rounded twice merely for being partitioned.
 */
export function estimateCustomHourlyWork(
  plan: CustomPayProfilePlan,
  sources: readonly CustomHourlySource[],
  calendarAdjustmentCount: number,
): CustomHourlyEstimate {
  const { periodKey, startDay } = plan;
  if (startDay === 1) return result('disabled', periodKey, startDay, []);
  // Validate the custom period key even when no profile or work is available.
  const period = customPayPeriodBounds(periodKey, startDay);
  if (!Number.isSafeInteger(calendarAdjustmentCount) || calendarAdjustmentCount < 0)
    return result('blocked', periodKey, startDay, ['INVALID_CUSTOM_ADJUSTMENT_COUNT']);
  if (plan.status === 'profile_transition_review_required')
    return estimateCustomMixedHourlyWork(plan, sources, calendarAdjustmentCount);
  if (plan.status === 'needs_profile')
    return result('needs_profile', periodKey, startDay, [
      'CUSTOM_PAY_OPENING_PROFILE_REQUIRED',
    ]);
  if (plan.status !== 'single_hourly_profile')
    return result('blocked', periodKey, startDay, ['CUSTOM_PAY_PROFILE_POLICY_UNRESOLVED']);
  if (calendarAdjustmentCount !== 0)
    return result('blocked', periodKey, startDay, [
      'CUSTOM_PAY_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION',
    ]);

  let profile: EarningsProfile;
  try {
    profile = validateSingleRatePlan(plan);
  } catch (error) {
    return result('blocked', periodKey, startDay, [
      error instanceof Error ? error.message : 'CUSTOM_PAY_PROFILE_INVALID',
    ]);
  }
  const reasons: string[] = [];
  const portions: {
    portion: PayPeriodWorkPortion;
    auditRevision: number | null;
  }[] = [];
  const workIds = new Set<string>();
  if (!Array.isArray(sources))
    return result('blocked', periodKey, startDay, ['INVALID_WORK_SET']);

  for (const { work, allocation, auditRevision } of sources) {
    try {
      const verified = validateEarningsWork(work);
      if (workIds.has(verified.id)) throw new Error('DUPLICATE_CUSTOM_WORK_ID');
      workIds.add(verified.id);
      const portion = splitWorkForPayPeriod(verified, periodKey, startDay, allocation);
      if (!portion) {
        if (allocation || auditRevision !== undefined)
          throw new Error('UNEXPECTED_CUSTOM_BREAK_AUDIT');
        continue;
      }
      if (portion.splitAcrossPeriods && verified.breakMinutes > 0) {
        if (
          !allocation ||
          !Number.isSafeInteger(auditRevision) ||
          (auditRevision as number) < 1
        )
          throw new Error('UNVERIFIED_CUSTOM_BREAK_AUDIT');
      } else if (allocation || auditRevision !== undefined) {
        throw new Error('UNEXPECTED_CUSTOM_BREAK_AUDIT');
      }
      portions.push({ portion, auditRevision: auditRevision ?? null });
    } catch (error) {
      reasons.push(
        (error instanceof Error ? error.message : 'INVALID_CUSTOM_WORK') + ':' + work?.id,
      );
    }
  }
  if (reasons.length) return result('blocked', periodKey, startDay, reasons);
  if (portions.length === 0) return result('no_work', periodKey, startDay, []);

  portions.sort(
    (a, b) =>
      a.portion.startInstantUtc.localeCompare(b.portion.startInstantUtc) ||
      a.portion.workId.localeCompare(b.portion.workId),
  );
  let previousEnd = '';
  for (const item of portions) {
    if (item.portion.startInstantUtc < previousEnd)
      reasons.push('OVERLAPPING_CUSTOM_WORK:' + item.portion.workId);
    if (item.portion.endInstantUtc > previousEnd) previousEnd = item.portion.endInstantUtc;
  }
  if (reasons.length) return result('blocked', periodKey, startDay, reasons);

  const threshold =
    profile.overtimeAfterMinutes === null ? null : profile.overtimeAfterMinutes * 60;
  let loggedSeconds = 0;
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  let lastRegularMinor = 0n;
  let lastOvertimeMinor = 0n;
  const lines: CustomHourlyLine[] = [];
  for (const { portion, auditRevision } of portions) {
    const previousLogged = loggedSeconds;
    loggedSeconds += portion.netSeconds;
    if (!Number.isSafeInteger(loggedSeconds))
      return result('blocked', periodKey, startDay, ['CUSTOM_PAY_WORK_SECONDS_OVERFLOW']);
    const regular =
      threshold === null
        ? portion.netSeconds
        : Math.max(0, Math.min(portion.netSeconds, threshold - previousLogged));
    const overtime = portion.netSeconds - regular;
    regularSeconds += regular;
    overtimeSeconds += overtime;
    const shared = {
      workId: portion.workId,
      sourceStartUtc: portion.originStartUtc,
      sourceEndUtc: portion.originEndUtc,
      segmentStartUtc: portion.startInstantUtc,
      segmentEndUtc: portion.endInstantUtc,
      timeZone: portion.timeZone,
      sourceBreakMinutes: portion.breakMinutes,
      breakAuditRevision: auditRevision,
      profileId: profile.id,
      profileRevision: profile.revision,
    };
    if (regular > 0) {
      const minor = BigInt(
        roundRational(BigInt(profile.baseMinorUnits) * BigInt(regularSeconds), 3600n),
      );
      const delta = minor - lastRegularMinor;
      if (delta > MAX_MINOR_UNITS)
        return result('blocked', periodKey, startDay, ['CUSTOM_PAY_MONEY_LIMIT']);
      lines.push({
        ...shared,
        kind: 'regular',
        seconds: regular,
        amountMinorUnits: Number(delta),
      });
      lastRegularMinor = minor;
    }
    if (overtime > 0) {
      const minor = BigInt(
        roundRational(
          BigInt(profile.baseMinorUnits) *
            BigInt(overtimeSeconds) *
            BigInt(profile.overtimeMultiplierNumerator),
          3600n * BigInt(profile.overtimeMultiplierDenominator),
        ),
      );
      const delta = minor - lastOvertimeMinor;
      if (delta > MAX_MINOR_UNITS)
        return result('blocked', periodKey, startDay, ['CUSTOM_PAY_MONEY_LIMIT']);
      lines.push({
        ...shared,
        kind: 'overtime',
        seconds: overtime,
        amountMinorUnits: Number(delta),
      });
      lastOvertimeMinor = minor;
    }
  }
  const total = lastRegularMinor + lastOvertimeMinor;
  if (total > MAX_MINOR_UNITS)
    return result('blocked', periodKey, startDay, ['CUSTOM_PAY_MONEY_LIMIT']);
  return {
    status: 'estimated',
    periodKey,
    startDay,
    startDate: period.startDate,
    endDateInclusive: period.endDateInclusive,
    currency: profile.currency,
    profileId: profile.id,
    profileRevision: profile.revision,
    profileCount: 1,
    regularSeconds,
    overtimeSeconds,
    loggedSeconds,
    workOnlyMinorUnits: Number(total),
    lines,
    scope: 'ACTUAL_WORK_ONLY_NO_ADJUSTMENTS',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}
