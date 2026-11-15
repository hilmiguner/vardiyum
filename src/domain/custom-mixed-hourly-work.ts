import {
  roundRational,
  validateEarningsProfile,
  validateEarningsWork,
  type EarningsProfile,
} from './earnings-engine.ts';
import {
  planCustomPayProfiles,
  type CustomPayProfilePlan,
} from './custom-pay-profile-policy.ts';
import {
  customPayPeriodBounds,
  splitWorkForPayPeriod,
  type PayPeriodWorkPortion,
} from './pay-period.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';
import {
  createRateBreakEvent,
  type RateBoundaryBreakEvent,
} from './rate-boundary-break-audit.ts';
import type {
  CustomHourlyEstimate,
  CustomHourlyLine,
  CustomHourlySource,
} from './custom-hourly-work-estimate.ts';

/**
 * Effective-month hourly rate policy, without an automatic choice about the
 * placement of a break straddling a rate-change midnight.
 *
 * One period-wide overtime threshold is required. The threshold DOES NOT
 * restart on a rate-change date. The rate and explicit overtime multiplier
 * of the effective profile apply to the net seconds earned after that date.
 * No fixed salary, currency exchange, calendar adjustments or legal payroll.
 */
const MAX_MINOR_UNITS = 1_000_000_000_000n;

type RatePart = {
  portion: PayPeriodWorkPortion;
  startInstantUtc: string;
  endInstantUtc: string;
  netSeconds: number;
  breakMinutes: number;
  auditRevision: number | null;
  rateBreakAuditRevision: number | null;
  profile: EarningsProfile;
};

function blocked(plan: CustomPayProfilePlan, reason: string): CustomHourlyEstimate {
  return {
    status: 'blocked',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    reasons: [reason],
  };
}

function resolveMixedPlan(plan: CustomPayProfilePlan): {
  profiles: [EarningsProfile, EarningsProfile];
  boundaryLocalDate: string;
  currency: string;
  thresholdSeconds: number | null;
} {
  if (plan.status !== 'profile_transition_review_required' || plan.segments.length !== 2)
    throw new Error('CUSTOM_MIXED_PROFILE_REVIEW_REQUIRED');
  const canonical = planCustomPayProfiles(
    plan.periodKey,
    plan.startDay,
    plan.timeZone,
    plan.segments.map((segment) => segment.profile),
  );
  if (JSON.stringify(canonical) !== JSON.stringify(plan))
    throw new Error('CUSTOM_MIXED_PROFILE_PLAN_CHANGED');
  const period = customPayPeriodBounds(plan.periodKey, plan.startDay);
  if (period.startDate !== plan.startDate || period.endDateInclusive !== plan.endDateInclusive)
    throw new Error('CUSTOM_MIXED_PROFILE_PERIOD_CHANGED');

  const before = validateEarningsProfile(plan.segments[0].profile);
  const after = validateEarningsProfile(plan.segments[1].profile);
  if (before.model !== 'hourly' || after.model !== 'hourly')
    throw new Error('CUSTOM_MIXED_FIXED_PAY_POLICY_REQUIRED');
  if (before.currency !== after.currency)
    throw new Error('CUSTOM_MIXED_CURRENCY_POLICY_REQUIRED');
  if (before.overtimeAfterMinutes !== after.overtimeAfterMinutes)
    throw new Error('CUSTOM_MIXED_THRESHOLD_POLICY_REQUIRED');
  if (before.id === after.id) throw new Error('CUSTOM_MIXED_PROFILE_ID_COLLISION');

  return {
    profiles: [before, after],
    boundaryLocalDate: plan.segments[1].startDate,
    currency: before.currency,
    thresholdSeconds:
      before.overtimeAfterMinutes === null ? null : before.overtimeAfterMinutes * 60,
  };
}

function rateParts(
  work: CustomHourlySource['work'],
  portion: PayPeriodWorkPortion,
  auditRevision: number | null,
  rateBreakAudit: RateBoundaryBreakEvent | undefined,
  startDay: number,
  profiles: [EarningsProfile, EarningsProfile],
  boundaryLocalDate: string,
): RatePart[] {
  // This time-zone is the ORIGINAL WORK source's saved IANA zone, not the
  // schedule time-zone used to display the profile coverage preview.
  const midnight = resolveLocalBoundary(boundaryLocalDate, '00:00', portion.timeZone, 'reject');
  if (midnight.status !== 'resolved') throw new Error('CUSTOM_MIXED_RATE_MIDNIGHT_UNRESOLVED');
  const border = Date.parse(midnight.instantUtc);
  const start = Date.parse(portion.startInstantUtc);
  const end = Date.parse(portion.endInstantUtc);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end)
    throw new Error('INVALID_CUSTOM_RATE_PORTION');

  const crosses = start < border && border < end;
  // A rate-boundary split is a separate, explicitly user-entered revision.
  // The older pay-period break allocation never resolves rate attribution.
  if ((!crosses || portion.breakMinutes === 0) && rateBreakAudit)
    throw new Error('UNEXPECTED_RATE_BREAK_AUDIT');
  let beforeBreak = 0;
  if (crosses && portion.breakMinutes > 0) {
    if (!rateBreakAudit) throw new Error('CUSTOM_RATE_BREAK_ALLOCATION_REQUIRED');
    const canonical = createRateBreakEvent(
      work,
      startDay,
      portion.periodKey,
      boundaryLocalDate,
      rateBreakAudit.beforeRateBreakMinutes,
      rateBreakAudit.revision,
      rateBreakAudit.reason,
      rateBreakAudit.recordedAt,
    );
    if (JSON.stringify(canonical) !== JSON.stringify(rateBreakAudit))
      throw new Error('INVALID_RATE_BREAK_AUDIT_SOURCE');
    beforeBreak = canonical.beforeRateBreakMinutes;
  }

  const ranges: { start: number; end: number; profile: EarningsProfile }[] = [
    { start, end: Math.min(end, border), profile: profiles[0] },
    { start: Math.max(start, border), end, profile: profiles[1] },
  ];
  const result: RatePart[] = [];
  for (const range of ranges) {
    if (range.start >= range.end) continue;
    const seconds = (range.end - range.start) / 1000;
    const breaks = crosses
      ? range.profile.id === profiles[0].id
        ? beforeBreak
        : portion.breakMinutes - beforeBreak
      : portion.breakMinutes;
    if (!Number.isSafeInteger(seconds) || breaks * 60 > seconds)
      throw new Error('CUSTOM_RATE_BREAK_EXCEEDS_SEGMENT');
    result.push({
      portion,
      startInstantUtc: new Date(range.start).toISOString(),
      endInstantUtc: new Date(range.end).toISOString(),
      netSeconds: seconds - breaks * 60,
      breakMinutes: breaks,
      auditRevision,
      rateBreakAuditRevision: rateBreakAudit?.revision ?? null,
      profile: range.profile,
    });
  }
  if (
    result.length === 0 ||
    result.reduce((sum, item) => sum + item.netSeconds, 0) !== portion.netSeconds
  )
    throw new Error('CUSTOM_MIXED_RATE_SECONDS_MISMATCH');
  return result;
}

/**
 * Called ONLY for a validated two-profile plan. Returns a source-linked
 * work-only pre-tax result when all profile/actual-work ambiguities resolve.
 * Deliberately leaves the existing single-rate engine unchanged.
 */
export function estimateCustomMixedHourlyWork(
  plan: CustomPayProfilePlan,
  sources: readonly CustomHourlySource[],
  calendarAdjustmentCount: number,
): CustomHourlyEstimate {
  if (plan.startDay === 1) return blocked(plan, 'CUSTOM_MIXED_DAY_ONE_NOT_SUPPORTED');
  if (!Number.isSafeInteger(calendarAdjustmentCount) || calendarAdjustmentCount < 0)
    return blocked(plan, 'INVALID_CUSTOM_ADJUSTMENT_COUNT');
  if (calendarAdjustmentCount !== 0)
    return blocked(plan, 'CUSTOM_PAY_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION');
  if (!Array.isArray(sources)) return blocked(plan, 'INVALID_WORK_SET');

  let policy: ReturnType<typeof resolveMixedPlan>;
  try {
    policy = resolveMixedPlan(plan);
  } catch (error) {
    return blocked(
      plan,
      error instanceof Error ? error.message : 'CUSTOM_MIXED_PROFILE_INVALID',
    );
  }

  const original: {
    work: CustomHourlySource['work'];
    portion: PayPeriodWorkPortion;
    auditRevision: number | null;
    rateBreakAudit?: RateBoundaryBreakEvent;
  }[] = [];
  const ids = new Set<string>();
  for (const item of sources) {
    try {
      if (!item || !item.work) throw new Error('INVALID_CUSTOM_WORK');
      const work = validateEarningsWork(item.work);
      if (ids.has(work.id)) throw new Error('DUPLICATE_CUSTOM_WORK_ID');
      ids.add(work.id);
      const portion = splitWorkForPayPeriod(
        work,
        plan.periodKey,
        plan.startDay,
        item.allocation,
      );
      if (!portion) {
        if (item.allocation || item.auditRevision !== undefined)
          throw new Error('UNEXPECTED_CUSTOM_BREAK_AUDIT');
        continue;
      }
      if (portion.splitAcrossPeriods && work.breakMinutes > 0) {
        if (
          !item.allocation ||
          !Number.isSafeInteger(item.auditRevision) ||
          (item.auditRevision as number) < 1
        )
          throw new Error('UNVERIFIED_CUSTOM_BREAK_AUDIT');
      } else if (item.allocation || item.auditRevision !== undefined) {
        throw new Error('UNEXPECTED_CUSTOM_BREAK_AUDIT');
      }
      original.push({
        work,
        portion,
        auditRevision: item.auditRevision ?? null,
        rateBreakAudit: item.rateBreakAudit,
      });
    } catch (error) {
      return blocked(
        plan,
        (error instanceof Error ? error.message : 'INVALID_CUSTOM_WORK') +
          ':' +
          (item?.work?.id ?? '-'),
      );
    }
  }
  if (!original.length)
    return {
      status: 'no_work',
      periodKey: plan.periodKey,
      startDay: plan.startDay,
      reasons: [],
    };

  original.sort(
    (a, b) =>
      a.portion.startInstantUtc.localeCompare(b.portion.startInstantUtc) ||
      a.portion.workId.localeCompare(b.portion.workId),
  );
  let previousEnd = '';
  for (const item of original) {
    if (item.portion.startInstantUtc < previousEnd)
      return blocked(plan, 'OVERLAPPING_CUSTOM_WORK:' + item.portion.workId);
    if (item.portion.endInstantUtc > previousEnd) previousEnd = item.portion.endInstantUtc;
  }

  let parts: RatePart[] = [];
  try {
    for (const item of original) {
      parts.push(
        ...rateParts(
          item.work,
          item.portion,
          item.auditRevision,
          item.rateBreakAudit,
          plan.startDay,
          policy.profiles,
          policy.boundaryLocalDate,
        ),
      );
    }
  } catch (error) {
    return blocked(
      plan,
      error instanceof Error ? error.message : 'INVALID_CUSTOM_MIXED_RATE_PART',
    );
  }
  parts = parts.sort(
    (a, b) =>
      a.startInstantUtc.localeCompare(b.startInstantUtc) ||
      a.portion.workId.localeCompare(b.portion.workId),
  );

  let loggedSeconds = 0;
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  let runningTotal = 0n;
  const buckets = new Map<string, { seconds: number; lastRounded: bigint }>();
  const lines: CustomHourlyLine[] = [];

  try {
    for (const part of parts) {
      const previousLogged = loggedSeconds;
      loggedSeconds += part.netSeconds;
      if (!Number.isSafeInteger(loggedSeconds))
        throw new Error('CUSTOM_PAY_WORK_SECONDS_OVERFLOW');
      const regular =
        policy.thresholdSeconds === null
          ? part.netSeconds
          : Math.max(0, Math.min(part.netSeconds, policy.thresholdSeconds - previousLogged));
      const overtime = part.netSeconds - regular;
      regularSeconds += regular;
      overtimeSeconds += overtime;

      for (const [kind, seconds] of [
        ['regular', regular],
        ['overtime', overtime],
      ] as const) {
        if (seconds === 0) continue;
        const name = part.profile.id + ':' + part.profile.revision + ':' + kind;
        const bucket = buckets.get(name) ?? { seconds: 0, lastRounded: 0n };
        bucket.seconds += seconds;
        if (!Number.isSafeInteger(bucket.seconds))
          throw new Error('CUSTOM_PAY_WORK_SECONDS_OVERFLOW');
        const numerator =
          BigInt(part.profile.baseMinorUnits) *
          BigInt(bucket.seconds) *
          (kind === 'overtime' ? BigInt(part.profile.overtimeMultiplierNumerator) : 1n);
        const denominator =
          3600n *
          (kind === 'overtime' ? BigInt(part.profile.overtimeMultiplierDenominator) : 1n);
        const rounded = BigInt(roundRational(numerator, denominator));
        const delta = rounded - bucket.lastRounded;
        if (delta < 0n || rounded > MAX_MINOR_UNITS || runningTotal + delta > MAX_MINOR_UNITS)
          throw new Error('CUSTOM_PAY_MONEY_LIMIT');
        buckets.set(name, { seconds: bucket.seconds, lastRounded: rounded });
        runningTotal += delta;
        lines.push({
          workId: part.portion.workId,
          kind,
          sourceStartUtc: part.portion.originStartUtc,
          sourceEndUtc: part.portion.originEndUtc,
          segmentStartUtc: part.startInstantUtc,
          segmentEndUtc: part.endInstantUtc,
          timeZone: part.portion.timeZone,
          sourceBreakMinutes: part.breakMinutes,
          breakAuditRevision: part.auditRevision,
          rateBreakAuditRevision: part.rateBreakAuditRevision,
          seconds,
          amountMinorUnits: Number(delta),
          profileId: part.profile.id,
          profileRevision: part.profile.revision,
        });
      }
    }
  } catch (error) {
    return blocked(plan, error instanceof Error ? error.message : 'CUSTOM_MIXED_PAY_FAILED');
  }
  return {
    status: 'estimated',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    startDate: plan.startDate,
    endDateInclusive: plan.endDateInclusive,
    currency: policy.currency,
    profileId: null,
    profileRevision: null,
    profileCount: 2,
    regularSeconds,
    overtimeSeconds,
    loggedSeconds,
    workOnlyMinorUnits: Number(runningTotal),
    lines,
    scope: 'ACTUAL_WORK_ONLY_NO_ADJUSTMENTS',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}
