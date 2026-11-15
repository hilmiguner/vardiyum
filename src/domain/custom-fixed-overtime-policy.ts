import {
  createCustomFixedBaseEvent,
  eligibleFixedBaseProfile,
  fixedBaseChoiceMatchesPlan,
  type CustomFixedBaseEvent,
} from './custom-fixed-base-policy.ts';
import {
  planCustomPayProfiles,
  type CustomPayProfilePlan,
} from './custom-pay-profile-policy.ts';

export const FIXED_OVERTIME_PREFIX = 'earnings_custom_fixed_overtime_v1:';
export const FIXED_OVERTIME_MAX_REVISIONS = 64;
export type FixedOvertimeDecision = 'include_logged_overtime' | 'exclude_logged_overtime';

export interface FixedOvertimeEvent {
  schema: 1;
  source: 'user_entered';
  periodKey: string;
  startDay: number;
  scheduleTimeZone: string;
  fixedBase: CustomFixedBaseEvent;
  decision: FixedOvertimeDecision;
  revision: number;
  reason: string;
  recordedAt: string;
}

const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export function fixedOvertimePrefix(periodKey: string, startDay: number): string {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_FIXED_OVERTIME_PERIOD');
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('INVALID_FIXED_OVERTIME_START_DAY');
  return FIXED_OVERTIME_PREFIX + startDay + ':' + periodKey + ':';
}
export function fixedOvertimeHeadKey(periodKey: string, startDay: number): string {
  return fixedOvertimePrefix(periodKey, startDay) + 'head';
}
export function fixedOvertimeEventKey(
  periodKey: string,
  startDay: number,
  revision: number,
): string {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    revision > FIXED_OVERTIME_MAX_REVISIONS
  )
    throw new Error('INVALID_FIXED_OVERTIME_REVISION');
  return (
    fixedOvertimePrefix(periodKey, startDay) + 'event:' + String(revision).padStart(3, '0')
  );
}

export function validateFixedOvertimeProfile(plan: CustomPayProfilePlan): void {
  const profile = eligibleFixedBaseProfile(plan);
  if (profile.overtimeAfterMinutes === null || profile.overtimeHourlyMinorUnits <= 0)
    throw new Error('CUSTOM_FIXED_OVERTIME_PROFILE_NOT_CONFIGURED');
}

function canonicalBase(base: CustomFixedBaseEvent): CustomFixedBaseEvent {
  if (!base || typeof base !== 'object' || Array.isArray(base))
    throw new Error('INVALID_OVERTIME_BASE_SOURCE');
  const historicalPlan = planCustomPayProfiles(
    base.periodKey,
    base.startDay,
    base.scheduleTimeZone,
    [base.profile],
  );
  const reconstructed = createCustomFixedBaseEvent(
    historicalPlan,
    base.choice,
    base.choice === 'full_base' ? null : base.chosenBaseMinorUnits,
    base.revision,
    base.reason,
    base.recordedAt,
  );
  if (JSON.stringify(reconstructed) !== JSON.stringify(base))
    throw new Error('INVALID_OVERTIME_BASE_SOURCE');
  return reconstructed;
}

/** Bind user approval to the exact immutable base revision AND source profile. */
export function createFixedOvertimeEvent(
  plan: CustomPayProfilePlan,
  base: CustomFixedBaseEvent,
  decision: FixedOvertimeDecision,
  revision: number,
  reason: string,
  recordedAt: string,
): FixedOvertimeEvent {
  fixedOvertimeEventKey(plan.periodKey, plan.startDay, revision);
  validateFixedOvertimeProfile(plan);
  const prior = canonicalBase(base);
  if (!fixedBaseChoiceMatchesPlan(plan, prior))
    throw new Error('STALE_FIXED_OVERTIME_BASE_SOURCE');
  if (decision !== 'include_logged_overtime' && decision !== 'exclude_logged_overtime')
    throw new Error('INVALID_FIXED_OVERTIME_DECISION');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_FIXED_OVERTIME_REASON');
  if (typeof recordedAt !== 'string' || !UTC.test(recordedAt))
    throw new Error('INVALID_FIXED_OVERTIME_TIMESTAMP');
  const stamp = Date.parse(recordedAt);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== recordedAt)
    throw new Error('INVALID_FIXED_OVERTIME_TIMESTAMP');
  return {
    schema: 1,
    source: 'user_entered',
    periodKey: plan.periodKey,
    startDay: plan.startDay,
    scheduleTimeZone: plan.timeZone,
    fixedBase: prior,
    decision,
    revision,
    reason: reason.trim(),
    recordedAt,
  };
}

/** Historical events are individually verified against their OWN old base choice.
 * Current pricing separately refuses stale base/profile versions.
 */
export function decodeFixedOvertimeHistory(
  periodKey: string,
  startDay: number,
  rows: readonly { key: string; value: string }[],
): FixedOvertimeEvent[] {
  const prefix = fixedOvertimePrefix(periodKey, startDay);
  if (!Array.isArray(rows)) throw new Error('INVALID_FIXED_OVERTIME_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > FIXED_OVERTIME_MAX_REVISIONS + 1)
    throw new Error('FIXED_OVERTIME_REVISION_LIMIT');
  const head = rows.filter((row) => row.key === prefix + 'head');
  const events = rows.filter((row) => row.key !== prefix + 'head');
  if (
    head.length !== 1 ||
    !/^[1-9][0-9]*$/.test(head[0].value) ||
    Number(head[0].value) !== events.length ||
    events.length === 0
  )
    throw new Error('INVALID_FIXED_OVERTIME_HEAD');
  const history: FixedOvertimeEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const revision = index + 1;
    const row = events[index];
    if (row.key !== fixedOvertimeEventKey(periodKey, startDay, revision))
      throw new Error('FIXED_OVERTIME_EVENT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 2500)
      throw new Error('INVALID_FIXED_OVERTIME_EVENT');
    let candidate: FixedOvertimeEvent;
    try {
      candidate = JSON.parse(row.value) as FixedOvertimeEvent;
    } catch {
      throw new Error('INVALID_FIXED_OVERTIME_EVENT');
    }
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw new Error('INVALID_FIXED_OVERTIME_EVENT');
    let canonical: FixedOvertimeEvent;
    try {
      const base = candidate.fixedBase;
      const historicalPlan = planCustomPayProfiles(periodKey, startDay, base.scheduleTimeZone, [
        base.profile,
      ]);
      canonical = createFixedOvertimeEvent(
        historicalPlan,
        base,
        candidate.decision,
        revision,
        candidate.reason,
        candidate.recordedAt,
      );
    } catch {
      throw new Error('INVALID_FIXED_OVERTIME_EVENT');
    }
    if (JSON.stringify(canonical) !== row.value)
      throw new Error('INVALID_FIXED_OVERTIME_EVENT');
    if (
      history.length &&
      (canonical.recordedAt < history[history.length - 1].recordedAt ||
        (canonical.decision === history[history.length - 1].decision &&
          JSON.stringify(canonical.fixedBase) ===
            JSON.stringify(history[history.length - 1].fixedBase)))
    )
      throw new Error('INVALID_FIXED_OVERTIME_REDECISION');
    history.push(canonical);
  }
  return history;
}
