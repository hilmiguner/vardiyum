import {
  createCustomAdjustmentAttributionEvent,
  type CustomAdjustmentAttributionEvent,
} from './custom-adjustment-attribution.ts';
import type {
  CustomAdjustmentCandidate,
  CustomAdjustmentReport,
} from './custom-adjustment-attribution-store.ts';
import type { CustomFixedBaseReport } from './custom-fixed-base-store.ts';
import type { FixedOvertimeView } from './custom-fixed-overtime-store.ts';
import type { CustomHourlyEstimate } from './custom-hourly-work-estimate.ts';
import type { CustomPayProfilePlan } from './custom-pay-profile-policy.ts';

const MAX_MINOR = 1_000_000_000_000n;

export interface CombinedCustomAdjustmentLine {
  sourceId: string;
  sourceCalendarMonth: string;
  sourceKind: 'bonus' | 'deduction' | 'correction';
  sourceCurrency: string;
  sourceAmountMinorUnits: number;
  sourceNote: string;
  sourceCreatedAt: string;
  earlierPeriodKey: string;
  laterPeriodKey: string;
  earlierMinorUnits: number;
  laterMinorUnits: number;
  selectedMinorUnits: number;
  attributionRevision: number;
  attributionReason: string;
  attributionRecordedAt: string;
}

export interface CombinedCustomWorkLine {
  workId: string;
  kind: 'hourly_regular' | 'hourly_overtime' | 'fixed_overtime';
  profileId: string;
  profileRevision: number;
  sourceStartUtc: string;
  sourceEndUtc: string;
  segmentStartUtc: string;
  segmentEndUtc: string;
  timeZone: string;
  seconds: number;
  amountMinorUnits: number;
  breakAuditRevision: number | null;
  rateBreakAuditRevision: number | null;
  rateBreakAuditKind: 'rate' | 'dual' | null;
}

export type CustomPayCombinedEstimate =
  | { status: 'disabled'; periodKey: string; startDay: 1 }
  | {
      status: 'blocked';
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
      scheduleTimeZone: string;
      model: 'hourly_actual_work' | 'monthly_fixed';
      currency: string;
      profiles: { id: string; revision: number }[];
      baseRevision: number | null;
      overtimeConsentRevision: number | null;
      overtimeDecision:
        'not_applicable' | 'include_logged_overtime' | 'exclude_logged_overtime';
      fixedBaseMinorUnits: number;
      regularWorkMinorUnits: number;
      overtimeMinorUnits: number;
      earningsMinorUnits: number;
      adjustmentMinorUnits: number;
      totalMinorUnits: number;
      loggedSeconds: number;
      overtimeSeconds: number;
      workLines: CombinedCustomWorkLine[];
      adjustmentLines: CombinedCustomAdjustmentLine[];
      scope: 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE';
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    };

function blocked(plan: CustomPayProfilePlan, reason: string): CustomPayCombinedEstimate {
  return {
    status: 'blocked',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    reasons: [reason],
  };
}

function minor(value: number): bigint {
  if (!Number.isSafeInteger(value) || Math.abs(value) > Number(MAX_MINOR))
    throw new Error('CUSTOM_COMBINED_INVALID_MINOR_UNITS');
  return BigInt(value);
}

function checkedSum(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + minor(value), 0n);
  if (total > MAX_MINOR || total < -MAX_MINOR)
    throw new Error('CUSTOM_COMBINED_MONEY_OVERFLOW');
  return Number(total);
}

function verifiedAdjustmentLines(
  plan: CustomPayProfilePlan,
  report: CustomAdjustmentReport,
  latestAttributions: readonly CustomAdjustmentAttributionEvent[],
): CombinedCustomAdjustmentLine[] {
  if (report.status !== 'verified' && report.status !== 'empty')
    throw new Error('CUSTOM_COMBINED_UNATTRIBUTED_ADJUSTMENTS');
  if (
    report.periodKey !== plan.periodKey ||
    report.startDay !== plan.startDay ||
    report.startDate !== plan.startDate ||
    report.endDateInclusive !== plan.endDateInclusive ||
    report.pendingCount !== 0 ||
    report.candidates.length !== latestAttributions.length
  )
    throw new Error('CUSTOM_COMBINED_ADJUSTMENT_REPORT_MISMATCH');
  if (
    report.status === 'empty' &&
    (report.candidates.length !== 0 || report.totals.length !== 0)
  )
    throw new Error('CUSTOM_COMBINED_ADJUSTMENT_EMPTY_MISMATCH');
  if (report.status === 'verified' && report.candidates.length === 0)
    throw new Error('CUSTOM_COMBINED_ADJUSTMENT_EMPTY_MISMATCH');

  const unique = new Set<string>();
  const byCurrency = new Map<string, number[]>();
  const lines: CombinedCustomAdjustmentLine[] = [];
  for (let i = 0; i < report.candidates.length; i++) {
    const item: CustomAdjustmentCandidate = report.candidates[i];
    const audit = latestAttributions[i];
    if (!audit || unique.has(item.adjustmentId))
      throw new Error('CUSTOM_COMBINED_DUPLICATE_ADJUSTMENT');
    unique.add(item.adjustmentId);
    const canonical = createCustomAdjustmentAttributionEvent(
      audit.original,
      plan.startDay,
      audit.earlierMinorUnits,
      audit.revision,
      audit.reason,
      audit.recordedAt,
    );
    if (JSON.stringify(audit) !== JSON.stringify(canonical))
      throw new Error('CUSTOM_COMBINED_INVALID_ADJUSTMENT_AUDIT');
    const selected =
      plan.periodKey === audit.earlierPeriodKey
        ? audit.earlierMinorUnits
        : audit.laterMinorUnits;
    if (
      item.adjustmentId !== audit.adjustmentId ||
      item.sourceCalendarMonth !== audit.original.periodKey ||
      item.kind !== audit.original.kind ||
      item.currency !== audit.original.currency ||
      item.originalMinorUnits !== audit.original.amountMinorUnits ||
      item.note !== audit.original.note ||
      item.sourceCreatedAt !== audit.original.createdAt ||
      item.earlierPeriodKey !== audit.earlierPeriodKey ||
      item.laterPeriodKey !== audit.laterPeriodKey ||
      item.earlierMinorUnits !== audit.earlierMinorUnits ||
      item.laterMinorUnits !== audit.laterMinorUnits ||
      item.amountInSelectedPeriodMinorUnits !== selected ||
      item.revision !== audit.revision ||
      item.stale
    )
      throw new Error('CUSTOM_COMBINED_ADJUSTMENT_SOURCE_MISMATCH');
    if (plan.periodKey !== audit.earlierPeriodKey && plan.periodKey !== audit.laterPeriodKey)
      throw new Error('CUSTOM_COMBINED_ADJUSTMENT_OUTSIDE_PERIOD');
    const entries = byCurrency.get(audit.original.currency) ?? [];
    entries.push(selected);
    byCurrency.set(audit.original.currency, entries);
    lines.push({
      sourceId: audit.adjustmentId,
      sourceCalendarMonth: audit.original.periodKey,
      sourceKind: audit.original.kind,
      sourceCurrency: audit.original.currency,
      sourceAmountMinorUnits: audit.original.amountMinorUnits,
      sourceNote: audit.original.note,
      sourceCreatedAt: audit.original.createdAt,
      earlierPeriodKey: audit.earlierPeriodKey,
      laterPeriodKey: audit.laterPeriodKey,
      earlierMinorUnits: audit.earlierMinorUnits,
      laterMinorUnits: audit.laterMinorUnits,
      selectedMinorUnits: selected,
      attributionRevision: audit.revision,
      attributionReason: audit.reason,
      attributionRecordedAt: audit.recordedAt,
    });
  }
  if (
    byCurrency.size !== report.totals.length ||
    report.totals.some(
      (value) => checkedSum(byCurrency.get(value.currency) ?? []) !== value.minorUnits,
    )
  )
    throw new Error('CUSTOM_COMBINED_ADJUSTMENT_SUM_MISMATCH');
  return lines;
}

function hourlyWorkLines(
  plan: CustomPayProfilePlan,
  hourly: CustomHourlyEstimate | null,
): {
  currency: string;
  regularMinorUnits: number;
  overtimeMinorUnits: number;
  loggedSeconds: number;
  overtimeSeconds: number;
  workLines: CombinedCustomWorkLine[];
} {
  if (!hourly || hourly.status !== 'estimated')
    throw new Error(
      'CUSTOM_COMBINED_HOURLY_WORK_NOT_ESTIMATED:' + (hourly?.status ?? 'absent'),
    );
  if (
    hourly.periodKey !== plan.periodKey ||
    hourly.startDay !== plan.startDay ||
    hourly.startDate !== plan.startDate ||
    hourly.endDateInclusive !== plan.endDateInclusive ||
    hourly.profileCount !== plan.segments.length ||
    !plan.segments.every(
      (entry) => entry.profile.model === 'hourly' && entry.profile.currency === hourly.currency,
    ) ||
    hourly.lines.length === 0
  )
    throw new Error('CUSTOM_COMBINED_HOURLY_SOURCE_MISMATCH');

  const seen = new Set<string>();
  const regular: number[] = [];
  const overtime: number[] = [];
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  const workLines: CombinedCustomWorkLine[] = [];
  for (const line of hourly.lines) {
    const profile = plan.segments.find(
      (entry) =>
        entry.profile.id === line.profileId && entry.profile.revision === line.profileRevision,
    );
    if (
      !profile ||
      !['regular', 'overtime'].includes(line.kind) ||
      !Number.isSafeInteger(line.seconds) ||
      line.seconds < 0 ||
      !line.workId ||
      !line.timeZone ||
      !line.sourceStartUtc ||
      !line.sourceEndUtc ||
      !line.segmentStartUtc ||
      !line.segmentEndUtc ||
      line.segmentStartUtc >= line.segmentEndUtc ||
      line.sourceStartUtc > line.segmentStartUtc ||
      line.segmentEndUtc > line.sourceEndUtc
    )
      throw new Error('CUSTOM_COMBINED_INVALID_WORK_LINE');
    const key = [
      line.workId,
      line.kind,
      line.profileId,
      line.profileRevision,
      line.segmentStartUtc,
      line.segmentEndUtc,
    ].join('|');
    if (seen.has(key)) throw new Error('CUSTOM_COMBINED_DUPLICATE_WORK_LINE');
    seen.add(key);
    minor(line.amountMinorUnits);
    if (line.amountMinorUnits < 0) throw new Error('CUSTOM_COMBINED_NEGATIVE_WORK_AMOUNT');
    (line.kind === 'regular' ? regular : overtime).push(line.amountMinorUnits);
    if (line.kind === 'regular') regularSeconds += line.seconds;
    else overtimeSeconds += line.seconds;
    workLines.push({
      workId: line.workId,
      kind: line.kind === 'regular' ? 'hourly_regular' : 'hourly_overtime',
      profileId: line.profileId,
      profileRevision: line.profileRevision,
      sourceStartUtc: line.sourceStartUtc,
      sourceEndUtc: line.sourceEndUtc,
      segmentStartUtc: line.segmentStartUtc,
      segmentEndUtc: line.segmentEndUtc,
      timeZone: line.timeZone,
      seconds: line.seconds,
      amountMinorUnits: line.amountMinorUnits,
      breakAuditRevision: line.breakAuditRevision,
      rateBreakAuditRevision: line.rateBreakAuditRevision ?? null,
      rateBreakAuditKind: line.rateBreakAuditKind ?? null,
    });
  }
  const regularMoney = checkedSum(regular);
  const overtimeMoney = checkedSum(overtime);
  if (
    !Number.isSafeInteger(regularSeconds) ||
    !Number.isSafeInteger(overtimeSeconds) ||
    regularSeconds !== hourly.regularSeconds ||
    overtimeSeconds !== hourly.overtimeSeconds ||
    regularSeconds + overtimeSeconds !== hourly.loggedSeconds ||
    checkedSum([regularMoney, overtimeMoney]) !== hourly.workOnlyMinorUnits
  )
    throw new Error('CUSTOM_COMBINED_HOURLY_SUM_MISMATCH');
  return {
    currency: hourly.currency,
    regularMinorUnits: regularMoney,
    overtimeMinorUnits: overtimeMoney,
    loggedSeconds: hourly.loggedSeconds,
    overtimeSeconds,
    workLines,
  };
}

function fixedWorkLines(
  plan: CustomPayProfilePlan,
  base: CustomFixedBaseReport | null,
  overtime: FixedOvertimeView | null,
): {
  currency: string;
  baseMinorUnits: number;
  overtimeMinorUnits: number;
  loggedSeconds: number;
  overtimeSeconds: number;
  baseRevision: number;
  consentRevision: number;
  decision: 'include_logged_overtime' | 'exclude_logged_overtime';
  workLines: CombinedCustomWorkLine[];
} {
  if (!base || base.status !== 'estimated')
    throw new Error('CUSTOM_COMBINED_FIXED_BASE_NOT_ESTIMATED:' + (base?.status ?? 'absent'));
  if (
    base.periodKey !== plan.periodKey ||
    base.startDay !== plan.startDay ||
    base.startDate !== plan.startDate ||
    base.endDateInclusive !== plan.endDateInclusive ||
    plan.segments.length !== 1 ||
    plan.segments[0].profile.model !== 'monthly_fixed' ||
    base.currency !== plan.segments[0].profile.currency ||
    base.profileId !== plan.segments[0].profile.id ||
    base.profileRevision !== plan.segments[0].profile.revision ||
    base.latestRevision < 1
  )
    throw new Error('CUSTOM_COMBINED_FIXED_BASE_MISMATCH');
  minor(base.baseOnlyMinorUnits);
  if (
    !overtime ||
    overtime.status !== 'review' ||
    overtime.periodKey !== plan.periodKey ||
    overtime.startDay !== plan.startDay ||
    overtime.currency !== base.currency ||
    overtime.profileId !== base.profileId ||
    overtime.profileRevision !== base.profileRevision ||
    overtime.baseRevision !== base.latestRevision ||
    overtime.baseMinorUnits !== base.baseOnlyMinorUnits ||
    overtime.stale
  )
    throw new Error('CUSTOM_COMBINED_FIXED_OVERTIME_NOT_READY');
  if (overtime.estimate.status === 'excluded') {
    if (
      overtime.latestDecision !== 'exclude_logged_overtime' ||
      overtime.latestRevision !== overtime.estimate.consentRevision
    )
      throw new Error('CUSTOM_COMBINED_INVALID_EXCLUDE_CONSENT');
    return {
      currency: base.currency,
      baseMinorUnits: base.baseOnlyMinorUnits,
      overtimeMinorUnits: 0,
      loggedSeconds: 0,
      overtimeSeconds: 0,
      baseRevision: base.latestRevision,
      consentRevision: overtime.latestRevision,
      decision: 'exclude_logged_overtime',
      workLines: [],
    };
  }
  if (
    overtime.estimate.status !== 'estimated' ||
    overtime.latestDecision !== 'include_logged_overtime'
  )
    throw new Error('CUSTOM_COMBINED_FIXED_OT_NOT_APPROVED:' + overtime.estimate.status);
  const estimate = overtime.estimate;
  if (
    estimate.periodKey !== plan.periodKey ||
    estimate.startDay !== plan.startDay ||
    estimate.profileId !== base.profileId ||
    estimate.profileRevision !== base.profileRevision ||
    estimate.currency !== base.currency ||
    estimate.baseRevision !== base.latestRevision ||
    estimate.baseMinorUnits !== base.baseOnlyMinorUnits ||
    estimate.consentRevision !== overtime.latestRevision ||
    checkedSum([estimate.baseMinorUnits, estimate.overtimeMinorUnits]) !==
      estimate.combinedMinorUnits ||
    estimate.regularSeconds + estimate.overtimeSeconds !== estimate.loggedSeconds
  )
    throw new Error('CUSTOM_COMBINED_FIXED_OVERTIME_MISMATCH');
  const seen = new Set<string>();
  const lines: CombinedCustomWorkLine[] = [];
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  for (const line of estimate.lines) {
    if (
      line.profileId !== base.profileId ||
      line.profileRevision !== base.profileRevision ||
      !line.workId ||
      !line.timeZone ||
      line.sourceStartUtc > line.segmentStartUtc ||
      line.segmentEndUtc > line.sourceEndUtc ||
      line.segmentStartUtc >= line.segmentEndUtc ||
      !Number.isSafeInteger(line.regularSeconds) ||
      line.regularSeconds < 0 ||
      !Number.isSafeInteger(line.overtimeSeconds) ||
      line.overtimeSeconds < 0 ||
      !Number.isSafeInteger(line.overtimeMinorUnits) ||
      line.overtimeMinorUnits < 0
    )
      throw new Error('CUSTOM_COMBINED_INVALID_FIXED_OT_LINE');
    const key = [line.workId, line.segmentStartUtc, line.segmentEndUtc].join('|');
    if (seen.has(key)) throw new Error('CUSTOM_COMBINED_DUPLICATE_FIXED_OT_LINE');
    seen.add(key);
    regularSeconds += line.regularSeconds;
    overtimeSeconds += line.overtimeSeconds;
    lines.push({
      workId: line.workId,
      kind: 'fixed_overtime',
      profileId: line.profileId,
      profileRevision: line.profileRevision,
      sourceStartUtc: line.sourceStartUtc,
      sourceEndUtc: line.sourceEndUtc,
      segmentStartUtc: line.segmentStartUtc,
      segmentEndUtc: line.segmentEndUtc,
      timeZone: line.timeZone,
      seconds: line.overtimeSeconds,
      amountMinorUnits: line.overtimeMinorUnits,
      breakAuditRevision: line.breakAuditRevision,
      rateBreakAuditRevision: null,
      rateBreakAuditKind: null,
    });
  }
  if (
    regularSeconds !== estimate.regularSeconds ||
    overtimeSeconds !== estimate.overtimeSeconds ||
    checkedSum(estimate.lines.map((line) => line.overtimeMinorUnits)) !==
      estimate.overtimeMinorUnits
  )
    throw new Error('CUSTOM_COMBINED_FIXED_OVERTIME_SUM_MISMATCH');
  return {
    currency: base.currency,
    baseMinorUnits: base.baseOnlyMinorUnits,
    overtimeMinorUnits: estimate.overtimeMinorUnits,
    loggedSeconds: estimate.loggedSeconds,
    overtimeSeconds: estimate.overtimeSeconds,
    baseRevision: base.latestRevision,
    consentRevision: overtime.latestRevision,
    decision: 'include_logged_overtime',
    workLines: lines,
  };
}

/**
 * Pure read-only combination of ALREADY validated and current reports. This
 * function never mutates original calendar-month entries or any audit event.
 * A single SQLite snapshot and exact source-level revisions are mandatory at
 * the repository boundary (see custom-pay-combined-store).
 */
export function combineCustomPayPeriodComponents(
  plan: CustomPayProfilePlan,
  hourly: CustomHourlyEstimate | null,
  base: CustomFixedBaseReport | null,
  fixedOvertime: FixedOvertimeView | null,
  adjustments: CustomAdjustmentReport,
  latestAttributions: readonly CustomAdjustmentAttributionEvent[],
): CustomPayCombinedEstimate {
  if (plan.startDay === 1)
    return { status: 'disabled', periodKey: plan.periodKey, startDay: 1 };
  try {
    if (plan.status === 'needs_profile')
      throw new Error('CUSTOM_COMBINED_OPENING_PROFILE_REQUIRED');
    const adjustmentLines = verifiedAdjustmentLines(plan, adjustments, latestAttributions);
    const isHourly = plan.segments.every((segment) => segment.profile.model === 'hourly');
    const isFixed =
      plan.status === 'fixed_salary_assumption_required' &&
      plan.segments.length === 1 &&
      plan.segments[0].profile.model === 'monthly_fixed';
    if (!isHourly && !isFixed)
      throw new Error('CUSTOM_COMBINED_MIXED_FIXED_PROFILE_POLICY_REQUIRED');

    const profiles = plan.segments.map((segment) => ({
      id: segment.profile.id,
      revision: segment.profile.revision,
    }));
    let currency = '';
    let fixedBaseMinorUnits = 0;
    let regularWorkMinorUnits = 0;
    let overtimeMinorUnits = 0;
    let loggedSeconds = 0;
    let overtimeSeconds = 0;
    let baseRevision: number | null = null;
    let overtimeConsentRevision: number | null = null;
    let overtimeDecision:
      'not_applicable' | 'include_logged_overtime' | 'exclude_logged_overtime' =
      'not_applicable';
    let workLines: CombinedCustomWorkLine[] = [];
    if (isHourly) {
      const report = hourlyWorkLines(plan, hourly);
      currency = report.currency;
      regularWorkMinorUnits = report.regularMinorUnits;
      overtimeMinorUnits = report.overtimeMinorUnits;
      loggedSeconds = report.loggedSeconds;
      overtimeSeconds = report.overtimeSeconds;
      workLines = report.workLines;
    } else {
      const report = fixedWorkLines(plan, base, fixedOvertime);
      currency = report.currency;
      fixedBaseMinorUnits = report.baseMinorUnits;
      overtimeMinorUnits = report.overtimeMinorUnits;
      loggedSeconds = report.loggedSeconds;
      overtimeSeconds = report.overtimeSeconds;
      workLines = report.workLines;
      baseRevision = report.baseRevision;
      overtimeConsentRevision = report.consentRevision;
      overtimeDecision = report.decision;
    }
    if (adjustmentLines.some((line) => line.sourceCurrency !== currency))
      throw new Error('CUSTOM_COMBINED_CURRENCY_MISMATCH_NO_FX');
    const earningsMinorUnits = checkedSum([
      fixedBaseMinorUnits,
      regularWorkMinorUnits,
      overtimeMinorUnits,
    ]);
    const adjustmentMinorUnits = checkedSum(
      adjustmentLines.map((line) => line.selectedMinorUnits),
    );
    const totalMinorUnits = checkedSum([earningsMinorUnits, adjustmentMinorUnits]);
    if (totalMinorUnits < 0) throw new Error('CUSTOM_COMBINED_NEGATIVE_TOTAL_REQUIRES_REVIEW');
    return {
      status: 'estimated',
      periodKey: plan.periodKey,
      startDay: plan.startDay,
      startDate: plan.startDate,
      endDateInclusive: plan.endDateInclusive,
      scheduleTimeZone: plan.timeZone,
      model: isHourly ? 'hourly_actual_work' : 'monthly_fixed',
      currency,
      profiles,
      baseRevision,
      overtimeConsentRevision,
      overtimeDecision,
      fixedBaseMinorUnits,
      regularWorkMinorUnits,
      overtimeMinorUnits,
      earningsMinorUnits,
      adjustmentMinorUnits,
      totalMinorUnits,
      loggedSeconds,
      overtimeSeconds,
      workLines,
      adjustmentLines,
      scope: 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE',
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
    };
  } catch (error) {
    return blocked(
      plan,
      error instanceof Error ? error.message : 'CUSTOM_COMBINED_INVALID_SOURCES',
    );
  }
}
