import {
  createCustomBreakEvent,
  customBreakSourcePeriods,
  type CustomPayBreakEvent,
} from './custom-pay-break-audit.ts';
import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import { splitWorkForPayPeriod, type PayPeriodWorkPortion } from './pay-period.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';

export const DUAL_BREAK_PREFIX = 'earnings_dual_boundary_break_v1:';
export const DUAL_BREAK_MAX_REVISIONS = 64;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const PERIOD = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const EFFECTIVE = /^[0-9]{4}-(0[1-9]|1[0-2])-01$/;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export interface DualBoundaryBreakEvent {
  schema: 1;
  source: 'user_entered';
  workId: string;
  startDay: number;
  periodKey: string;
  effectiveDate: string;
  rateBoundaryUtc: string;
  timeZone: string;
  originalStartUtc: string;
  originalEndUtc: string;
  originalLocalDate: string;
  originalEndDate: string;
  originalBreakMinutes: number;
  payPeriodAudit: CustomPayBreakEvent;
  portionStartUtc: string;
  portionEndUtc: string;
  portionBreakMinutes: number;
  beforeRateBreakMinutes: number;
  revision: number;
  recordedAt: string;
  reason: string;
}

export interface DualBoundarySource {
  portion: PayPeriodWorkPortion;
  rateBoundaryUtc: string;
  beforeSeconds: number;
  afterSeconds: number;
  periodAuditRevision: number;
}

export function dualBreakPrefix(workId: string, startDay: number, periodKey: string): string {
  if (!ID.test(workId)) throw new Error('INVALID_DUAL_BREAK_WORK_ID');
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('INVALID_DUAL_BREAK_START_DAY');
  if (!PERIOD.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_DUAL_BREAK_PERIOD');
  return DUAL_BREAK_PREFIX + startDay + ':' + periodKey + ':' + workId + ':';
}

export function dualBreakHeadKey(workId: string, startDay: number, periodKey: string): string {
  return dualBreakPrefix(workId, startDay, periodKey) + 'head';
}

export function dualBreakEventKey(
  workId: string,
  startDay: number,
  periodKey: string,
  revision: number,
): string {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > DUAL_BREAK_MAX_REVISIONS)
    throw new Error('DUAL_BREAK_REVISION_LIMIT');
  return (
    dualBreakPrefix(workId, startDay, periodKey) + 'event:' + String(revision).padStart(3, '0')
  );
}

/** Requires a CURRENT validated custom-pay-period break audit. */
export function dualBoundarySource(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
  periodAudit: CustomPayBreakEvent,
): DualBoundarySource {
  dualBreakPrefix(work.id, startDay, periodKey);
  validateEarningsWork(work);
  if (!EFFECTIVE.test(effectiveDate) || effectiveDate.startsWith('0000'))
    throw new Error('INVALID_DUAL_BREAK_EFFECTIVE_DATE');
  const keys = customBreakSourcePeriods(work, startDay);
  if (periodKey !== keys.first && periodKey !== keys.last)
    throw new Error('DUAL_BREAK_OUTSIDE_SOURCE_PERIODS');
  if (!periodAudit || periodAudit.startDay !== startDay)
    throw new Error('DUAL_BREAK_PAY_PERIOD_AUDIT_REQUIRED');
  const canonicalPeriod = createCustomBreakEvent(
    work,
    startDay,
    periodAudit.startPeriodBreakMinutes,
    periodAudit.revision,
    periodAudit.reason,
    periodAudit.recordedAt,
  );
  if (JSON.stringify(canonicalPeriod) !== JSON.stringify(periodAudit))
    throw new Error('DUAL_BREAK_PAY_AUDIT_SOURCE_MISMATCH');
  const portion = splitWorkForPayPeriod(work, periodKey, startDay, canonicalPeriod);
  if (!portion || !portion.splitAcrossPeriods || portion.breakMinutes === 0)
    throw new Error('DUAL_BREAK_REQUIRES_BREAK_IN_RATE_PORTION');
  const boundary = resolveLocalBoundary(effectiveDate, '00:00', work.timeZone, 'reject');
  if (boundary.status !== 'resolved') throw new Error('DUAL_BREAK_MIDNIGHT_UNRESOLVED');
  const change = Date.parse(boundary.instantUtc);
  const start = Date.parse(portion.startInstantUtc);
  const end = Date.parse(portion.endInstantUtc);
  if (!(start < change && change < end)) throw new Error('DUAL_BREAK_RATE_NOT_IN_PAY_PORTION');
  return {
    portion,
    rateBoundaryUtc: boundary.instantUtc,
    beforeSeconds: (change - start) / 1000,
    afterSeconds: (end - change) / 1000,
    periodAuditRevision: canonicalPeriod.revision,
  };
}

export function createDualBoundaryBreakEvent(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
  periodAudit: CustomPayBreakEvent,
  beforeRateBreakMinutes: number,
  revision: number,
  reason: string,
  recordedAt: string,
): DualBoundaryBreakEvent {
  const info = dualBoundarySource(work, startDay, periodKey, effectiveDate, periodAudit);
  dualBreakEventKey(work.id, startDay, periodKey, revision);
  if (
    !Number.isSafeInteger(beforeRateBreakMinutes) ||
    beforeRateBreakMinutes < 0 ||
    beforeRateBreakMinutes > info.portion.breakMinutes ||
    beforeRateBreakMinutes * 60 > info.beforeSeconds ||
    (info.portion.breakMinutes - beforeRateBreakMinutes) * 60 > info.afterSeconds
  )
    throw new Error('DUAL_BREAK_EXCEEDS_RATE_SEGMENT');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_DUAL_BREAK_REASON');
  if (typeof recordedAt !== 'string' || !UTC.test(recordedAt))
    throw new Error('INVALID_DUAL_BREAK_TIMESTAMP');
  const stamp = Date.parse(recordedAt);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== recordedAt)
    throw new Error('INVALID_DUAL_BREAK_TIMESTAMP');

  return {
    schema: 1,
    source: 'user_entered',
    workId: work.id,
    startDay,
    periodKey,
    effectiveDate,
    rateBoundaryUtc: info.rateBoundaryUtc,
    timeZone: work.timeZone,
    originalStartUtc: work.startInstantUtc,
    originalEndUtc: work.endInstantUtc,
    originalLocalDate: work.localDate,
    originalEndDate: work.endDate,
    originalBreakMinutes: work.breakMinutes,
    payPeriodAudit: periodAudit,
    portionStartUtc: info.portion.startInstantUtc,
    portionEndUtc: info.portion.endInstantUtc,
    portionBreakMinutes: info.portion.breakMinutes,
    beforeRateBreakMinutes,
    revision,
    recordedAt,
    reason: reason.trim(),
  };
}

/**
 * Strict history validates EACH historical event using its own immutable
 * pay-period audit snapshot, even if the active period audit was corrected.
 * Current revision match is separately required before actual pricing.
 * This is app-level append-only, not cryptographic tamper protection.
 */
export function decodeDualBoundaryHistory(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
  rows: readonly { key: string; value: string }[],
): DualBoundaryBreakEvent[] {
  const prefix = dualBreakPrefix(work.id, startDay, periodKey);
  if (!Array.isArray(rows)) throw new Error('INVALID_DUAL_BREAK_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > DUAL_BREAK_MAX_REVISIONS + 1) throw new Error('DUAL_BREAK_REVISION_LIMIT');
  const heads = rows.filter((row) => row.key === prefix + 'head');
  const events = rows.filter((row) => row.key !== prefix + 'head');
  if (
    heads.length !== 1 ||
    !/^[1-9][0-9]*$/.test(heads[0].value) ||
    Number(heads[0].value) !== events.length ||
    events.length === 0
  )
    throw new Error('INVALID_DUAL_BREAK_HEAD');

  const history: DualBoundaryBreakEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const row = events[index];
    const revision = index + 1;
    if (row.key !== dualBreakEventKey(work.id, startDay, periodKey, revision))
      throw new Error('DUAL_BREAK_AUDIT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 2400)
      throw new Error('INVALID_DUAL_BREAK_EVENT');
    let parsed: DualBoundaryBreakEvent;
    try {
      parsed = JSON.parse(row.value) as DualBoundaryBreakEvent;
    } catch {
      throw new Error('INVALID_DUAL_BREAK_EVENT');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_DUAL_BREAK_EVENT');
    let canonical: DualBoundaryBreakEvent;
    try {
      canonical = createDualBoundaryBreakEvent(
        work,
        startDay,
        periodKey,
        effectiveDate,
        parsed.payPeriodAudit,
        parsed.beforeRateBreakMinutes,
        revision,
        parsed.reason,
        parsed.recordedAt,
      );
    } catch {
      throw new Error('INVALID_DUAL_BREAK_EVENT');
    }
    if (JSON.stringify(canonical) !== row.value) throw new Error('INVALID_DUAL_BREAK_EVENT');
    if (
      history.length &&
      (canonical.recordedAt < history[history.length - 1].recordedAt ||
        (canonical.beforeRateBreakMinutes ===
          history[history.length - 1].beforeRateBreakMinutes &&
          canonical.payPeriodAudit.revision ===
            history[history.length - 1].payPeriodAudit.revision))
    )
      throw new Error('INVALID_DUAL_BREAK_REVISION');
    history.push(canonical);
  }
  return history;
}
