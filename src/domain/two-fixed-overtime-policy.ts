import { planCustomPayProfiles, type CustomPayProfilePlan } from './custom-pay-profile-policy.ts';
import {
  createFixedTransitionBaseEvent,
  eligibleFixedTransition,
  fixedTransitionMatchesPlan,
  type FixedTransitionBaseEvent,
} from './custom-fixed-transition-policy.ts';

export const TWO_FIXED_OT_PREFIX = 'earnings_custom_two_fixed_overtime_policy_v1:';
export const TWO_FIXED_OT_MAX_REVISIONS = 64;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export type TwoFixedOvertimeDecision = 'exclude_logged_overtime' | 'include_logged_overtime';
/**
 * For any future engine, each segment uses its OWN immutable profile threshold.
 * CARRY: pre-transition logged seconds count toward the second source's threshold.
 * RESET: seconds count restarts at the UTC effective-month transition.
 * Neither mode creates a wage estimate or alters legal overtime entitlements.
 */
export type TwoFixedThresholdMode = 'carry_worked_time' | 'restart_at_transition';
export interface TwoFixedOvertimePolicyEvent {
  schema: 1;
  source: 'user_entered';
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  fixedTransitionBase: FixedTransitionBaseEvent;
  decision: TwoFixedOvertimeDecision;
  thresholdMode: TwoFixedThresholdMode | null;
  revision: number;
  reason: string;
  recordedAt: string;
}

export function twoFixedOvertimePrefix(periodKey: string, day: number): string {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_TWO_FIXED_OT_PERIOD');
  if (!Number.isSafeInteger(day) || day < 2 || day > 28)
    throw new Error('INVALID_TWO_FIXED_OT_DAY');
  return TWO_FIXED_OT_PREFIX + day + ':' + periodKey + ':';
}

export function twoFixedOvertimeHeadKey(periodKey: string, day: number): string {
  return twoFixedOvertimePrefix(periodKey, day) + 'head';
}

export function twoFixedOvertimeEventKey(periodKey: string, day: number, revision: number): string {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > TWO_FIXED_OT_MAX_REVISIONS)
    throw new Error('TWO_FIXED_OT_REVISION_LIMIT');
  return twoFixedOvertimePrefix(periodKey, day) + 'event:' + String(revision).padStart(3, '0');
}

export function createTwoFixedOvertimePolicyEvent(
  plan: CustomPayProfilePlan,
  base: FixedTransitionBaseEvent,
  decision: TwoFixedOvertimeDecision,
  thresholdMode: TwoFixedThresholdMode | null,
  revision: number,
  reason: string,
  recordedAt: string,
): TwoFixedOvertimePolicyEvent {
  twoFixedOvertimeEventKey(plan.periodKey, plan.startDay, revision);
  const sources = eligibleFixedTransition(plan);
  if (!base || !fixedTransitionMatchesPlan(plan, base))
    throw new Error('STALE_TWO_FIXED_OT_BASE');
  const canonicalBase = createFixedTransitionBaseEvent(
    plan,
    [base.segments[0].declaredBaseMinorUnits, base.segments[1].declaredBaseMinorUnits],
    base.revision, base.reason, base.recordedAt,
  );
  if (JSON.stringify(canonicalBase) !== JSON.stringify(base))
    throw new Error('INVALID_TWO_FIXED_OT_BASE');
  if (decision !== 'include_logged_overtime' && decision !== 'exclude_logged_overtime')
    throw new Error('INVALID_TWO_FIXED_OT_DECISION');
  if (decision === 'exclude_logged_overtime') {
    if (thresholdMode !== null) throw new Error('TWO_FIXED_OT_EXCLUDE_MODE_MUST_BE_NULL');
  } else {
    if (thresholdMode !== 'carry_worked_time' && thresholdMode !== 'restart_at_transition')
      throw new Error('TWO_FIXED_OT_THRESHOLD_CHOICE_REQUIRED');
    for (const segment of sources) {
      if (segment.profile.overtimeAfterMinutes === null ||
        segment.profile.overtimeHourlyMinorUnits <= 0)
        throw new Error('TWO_FIXED_OT_SOURCE_RATE_NOT_CONFIGURED');
    }
  }
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_TWO_FIXED_OT_REASON');
  if (typeof recordedAt !== 'string' || !UTC.test(recordedAt) ||
    !Number.isFinite(Date.parse(recordedAt)) ||
    new Date(recordedAt).toISOString() !== recordedAt)
    throw new Error('INVALID_TWO_FIXED_OT_TIMESTAMP');
  return {
    schema: 1, source: 'user_entered',
    periodKey: plan.periodKey, startDay: plan.startDay, scheduleTimeZone: plan.timeZone,
    fixedTransitionBase: canonicalBase, decision, thresholdMode, revision,
    reason: reason.trim(), recordedAt,
  };
}

/** Historical decisions replay against their original exact base/profile sources. */
export function decodeTwoFixedOvertimePolicyHistory(
  periodKey: string,
  day: number,
  rows: readonly { key: string; value: string }[],
): TwoFixedOvertimePolicyEvent[] {
  const prefix = twoFixedOvertimePrefix(periodKey, day);
  if (!Array.isArray(rows)) throw new Error('INVALID_TWO_FIXED_OT_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > TWO_FIXED_OT_MAX_REVISIONS + 1)
    throw new Error('TWO_FIXED_OT_REVISION_LIMIT');
  const heads = rows.filter((x) => x.key === prefix + 'head');
  const events = rows.filter((x) => x.key !== prefix + 'head');
  if (heads.length !== 1 ||
    !/^[1-9][0-9]*$/.test(heads[0].value) ||
    Number(heads[0].value) !== events.length ||
    events.length === 0)
    throw new Error('INVALID_TWO_FIXED_OT_HEAD');
  const history: TwoFixedOvertimePolicyEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const row = events[index];
    const revision = index + 1;
    if (row.key !== twoFixedOvertimeEventKey(periodKey, day, revision))
      throw new Error('TWO_FIXED_OT_EVENT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 6400)
      throw new Error('INVALID_TWO_FIXED_OT_EVENT');
    try {
      const value = JSON.parse(row.value) as TwoFixedOvertimePolicyEvent;
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !value.fixedTransitionBase || !Array.isArray(value.fixedTransitionBase.segments) ||
        value.fixedTransitionBase.segments.length !== 2)
        throw new Error('INVALID_TWO_FIXED_OT_EVENT');
      const base = value.fixedTransitionBase;
      const plan = planCustomPayProfiles(
        periodKey, day, base.scheduleTimeZone,
        [base.segments[0].profile, base.segments[1].profile],
      );
      const canonical = createTwoFixedOvertimePolicyEvent(
        plan, base, value.decision, value.thresholdMode,
        revision, value.reason, value.recordedAt,
      );
      if (JSON.stringify(canonical) !== row.value)
        throw new Error('INVALID_TWO_FIXED_OT_EVENT');
      const last = history[history.length - 1];
      if (last && (canonical.recordedAt < last.recordedAt ||
        (canonical.decision === last.decision &&
          canonical.thresholdMode === last.thresholdMode &&
          JSON.stringify(canonical.fixedTransitionBase) ===
            JSON.stringify(last.fixedTransitionBase))))
        throw new Error('INVALID_TWO_FIXED_OT_REDECISION');
      history.push(canonical);
    } catch {
      throw new Error('INVALID_TWO_FIXED_OT_EVENT');
    }
  }
  return history;
}

export function twoFixedOvertimePolicyMatches(
  plan: CustomPayProfilePlan,
  base: FixedTransitionBaseEvent,
  event: TwoFixedOvertimePolicyEvent,
): boolean {
  try {
    const canonical = createTwoFixedOvertimePolicyEvent(
      plan, base, event.decision, event.thresholdMode,
      event.revision, event.reason, event.recordedAt,
    );
    return JSON.stringify(canonical) === JSON.stringify(event);
  } catch {
    return false;
  }
}
