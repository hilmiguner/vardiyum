import { createCustomBreakEvent, type CustomPayBreakEvent } from './custom-pay-break-audit.ts';
import {
  createCustomFixedBaseEvent,
  eligibleFixedBaseProfile,
  fixedBaseChoiceMatchesPlan,
  type CustomFixedBaseEvent,
} from './custom-fixed-base-policy.ts';
import {
  createFixedOvertimeEvent,
  validateFixedOvertimeProfile,
  type FixedOvertimeEvent,
} from './custom-fixed-overtime-policy.ts';
import {
  roundRational, validateEarningsWork, type EarningsWork,
} from './earnings-engine.ts';
import type { CustomPayProfilePlan } from './custom-pay-profile-policy.ts';
import { splitWorkForPayPeriod, type PayPeriodWorkPortion } from './pay-period.ts';

const MAX_MINOR = 1_000_000_000_000n;

export interface FixedOvertimeWorkSource {
  work: EarningsWork;
  periodAudit?: CustomPayBreakEvent;
}

export interface FixedOvertimeLine {
  workId: string;
  sourceStartUtc: string;
  sourceEndUtc: string;
  segmentStartUtc: string;
  segmentEndUtc: string;
  timeZone: string;
  breakMinutes: number;
  breakAuditRevision: number | null;
  regularSeconds: number;
  overtimeSeconds: number;
  overtimeMinorUnits: number;
  profileId: string;
  profileRevision: number;
}

export type FixedOvertimeEstimate =
  | { status: 'blocked'; periodKey: string; startDay: number; reasons: string[] }
  | { status: 'needs_consent' | 'stale_consent'; periodKey: string; startDay: number }
  | { status: 'excluded'; periodKey: string; startDay: number; consentRevision: number }
  | {
      status: 'estimated';
      periodKey: string;
      startDay: number;
      profileId: string;
      profileRevision: number;
      currency: string;
      baseRevision: number;
      consentRevision: number;
      thresholdMinutes: number;
      overtimeHourlyMinorUnits: number;
      multiplierNumerator: number;
      multiplierDenominator: number;
      loggedSeconds: number;
      regularSeconds: number;
      overtimeSeconds: number;
      baseMinorUnits: number;
      overtimeMinorUnits: number;
      combinedMinorUnits: number;
      lines: FixedOvertimeLine[];
      scope: 'FIXED_BASE_PLUS_USER_REPORTED_OVERTIME_NO_ADJUSTMENTS';
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    };

function blocked(plan: CustomPayProfilePlan, reason: string): FixedOvertimeEstimate {
  return {
    status: 'blocked', periodKey: plan.periodKey, startDay: plan.startDay,
    reasons: [reason],
  };
}

/**
 * Entire period-wide logged-work threshold is user-entered in the immutable
 * profile; it does NOT represent a jurisdiction's statutory overtime limit.
 * The manually chosen fixed BASE is never prorated by work, and no regular
 * work time is paid again. All source portions and breaks remain auditable.
 */
export function estimateCustomFixedOvertime(
  plan: CustomPayProfilePlan,
  baseEvent: CustomFixedBaseEvent,
  consent: FixedOvertimeEvent | null,
  sources: readonly FixedOvertimeWorkSource[],
  calendarAdjustmentCount: number,
): FixedOvertimeEstimate {
  if (!Number.isSafeInteger(calendarAdjustmentCount) || calendarAdjustmentCount !== 0)
    return blocked(plan,'CUSTOM_FIXED_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION');
  let profile;
  try {
    profile=eligibleFixedBaseProfile(plan);
    validateFixedOvertimeProfile(plan);
    if (!fixedBaseChoiceMatchesPlan(plan, baseEvent))
      throw new Error('STALE_FIXED_OVERTIME_BASE_SOURCE');
    const canonicalBase=createCustomFixedBaseEvent(
      plan,baseEvent.choice,
      baseEvent.choice==='full_base' ? null : baseEvent.chosenBaseMinorUnits,
      baseEvent.revision,baseEvent.reason,baseEvent.recordedAt,
    );
    if (JSON.stringify(canonicalBase) !== JSON.stringify(baseEvent))
      throw new Error('INVALID_FIXED_OVERTIME_BASE_SOURCE');
  } catch (error) {
    return blocked(plan,error instanceof Error ? error.message : 'INVALID_FIXED_OVERTIME_PROFILE');
  }
  if (!consent)
    return {status:'needs_consent',periodKey:plan.periodKey,startDay:plan.startDay};
  let canonicalConsent;
  try {
    canonicalConsent=createFixedOvertimeEvent(
      plan, consent.fixedBase, consent.decision, consent.revision,
      consent.reason, consent.recordedAt,
    );
    if (JSON.stringify(canonicalConsent)!==JSON.stringify(consent))
      throw new Error('INVALID_FIXED_OVERTIME_CONSENT');
    if (JSON.stringify(canonicalConsent.fixedBase)!==JSON.stringify(baseEvent))
      return {status:'stale_consent',periodKey:plan.periodKey,startDay:plan.startDay};
  } catch(error) {
    return blocked(plan,error instanceof Error ? error.message : 'INVALID_FIXED_OVERTIME_CONSENT');
  }
  if (canonicalConsent.decision==='exclude_logged_overtime')
    return {
      status:'excluded',periodKey:plan.periodKey,
      startDay:plan.startDay,consentRevision:canonicalConsent.revision,
    };
  if (!Array.isArray(sources)) return blocked(plan,'INVALID_FIXED_OVERTIME_WORK_SET');

  const portions: {work: EarningsWork; portion: PayPeriodWorkPortion; audit: CustomPayBreakEvent | undefined}[]=[];
  const seen=new Set<string>();
  const reasons: string[]=[];
  for(const source of sources) {
    try {
      if (!source || !source.work) throw new Error('INVALID_FIXED_OVERTIME_WORK');
      const work=validateEarningsWork(source.work);
      if(seen.has(work.id)) throw new Error('DUPLICATE_FIXED_OVERTIME_WORK');
      seen.add(work.id);
      if(source.periodAudit) {
        const audit=source.periodAudit;
        const canonical=createCustomBreakEvent(
          work,plan.startDay,audit.startPeriodBreakMinutes,
          audit.revision,audit.reason,audit.recordedAt,
        );
        if(JSON.stringify(canonical)!==JSON.stringify(audit))
          throw new Error('INVALID_FIXED_OVERTIME_PAY_BREAK_SOURCE');
      }
      const portion=splitWorkForPayPeriod(
        work,plan.periodKey,plan.startDay,source.periodAudit,
      );
      if(portion) portions.push({work,portion,audit:source.periodAudit});
      else if(source.periodAudit)
        throw new Error('FIXED_OVERTIME_BREAK_OUTSIDE_PERIOD');
    }catch(error){
      reasons.push((error instanceof Error?error.message:'INVALID_FIXED_OVERTIME_WORK')+':'+(source?.work?.id??'?'));
    }
  }
  if(reasons.length)
    return {status:'blocked',periodKey:plan.periodKey,startDay:plan.startDay,reasons};
  portions.sort((a,b)=>
    a.portion.startInstantUtc.localeCompare(b.portion.startInstantUtc) ||
    a.portion.workId.localeCompare(b.portion.workId),
  );
  let latestEnd='';
  for(const entry of portions) {
    if(entry.portion.startInstantUtc<latestEnd)
      reasons.push('OVERLAPPING_FIXED_OVERTIME_WORK:'+entry.portion.workId);
    if(entry.portion.endInstantUtc>latestEnd) latestEnd=entry.portion.endInstantUtc;
  }
  if(reasons.length)
    return {status:'blocked',periodKey:plan.periodKey,startDay:plan.startDay,reasons};

  const thresholdSeconds=profile.overtimeAfterMinutes! * 60;
  let loggedSeconds=0;
  let regularSeconds=0;
  let overtimeSeconds=0;
  let priorRounded=0n;
  const lines: FixedOvertimeLine[]=[];
  for(const {portion,audit} of portions) {
    const before=loggedSeconds;
    loggedSeconds+=portion.netSeconds;
    if(!Number.isSafeInteger(loggedSeconds))
      return blocked(plan,'FIXED_OVERTIME_SECONDS_OVERFLOW');
    const regular=Math.max(0,Math.min(portion.netSeconds,thresholdSeconds-before));
    const overtime=portion.netSeconds-regular;
    regularSeconds+=regular;
    overtimeSeconds+=overtime;
    const totalRounded=BigInt(roundRational(
      BigInt(profile.overtimeHourlyMinorUnits) *
        BigInt(overtimeSeconds) *
        BigInt(profile.overtimeMultiplierNumerator),
      3600n * BigInt(profile.overtimeMultiplierDenominator),
    ));
    const delta=totalRounded-priorRounded;
    if(delta<0n || delta>MAX_MINOR || totalRounded>MAX_MINOR)
      return blocked(plan,'FIXED_OVERTIME_MONEY_LIMIT');
    lines.push({
      workId:portion.workId,
      sourceStartUtc:portion.originStartUtc,
      sourceEndUtc:portion.originEndUtc,
      segmentStartUtc:portion.startInstantUtc,
      segmentEndUtc:portion.endInstantUtc,
      timeZone:portion.timeZone,
      breakMinutes:portion.breakMinutes,
      breakAuditRevision:audit?.revision??null,
      regularSeconds:regular,
      overtimeSeconds:overtime,
      overtimeMinorUnits:Number(delta),
      profileId:profile.id,
      profileRevision:profile.revision,
    });
    priorRounded=totalRounded;
  }
  const combined=BigInt(baseEvent.chosenBaseMinorUnits)+priorRounded;
  if(combined>MAX_MINOR) return blocked(plan,'FIXED_OVERTIME_MONEY_LIMIT');
  return {
    status:'estimated',periodKey:plan.periodKey,startDay:plan.startDay,
    profileId:profile.id,profileRevision:profile.revision,currency:profile.currency,
    baseRevision:baseEvent.revision,consentRevision:canonicalConsent.revision,
    thresholdMinutes:profile.overtimeAfterMinutes!,
    overtimeHourlyMinorUnits:profile.overtimeHourlyMinorUnits,
    multiplierNumerator:profile.overtimeMultiplierNumerator,
    multiplierDenominator:profile.overtimeMultiplierDenominator,
    loggedSeconds,regularSeconds,overtimeSeconds,
    baseMinorUnits:baseEvent.chosenBaseMinorUnits,
    overtimeMinorUnits:Number(priorRounded),
    combinedMinorUnits:Number(combined),
    lines,
    scope:'FIXED_BASE_PLUS_USER_REPORTED_OVERTIME_NO_ADJUSTMENTS',
    disclaimer:'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}
