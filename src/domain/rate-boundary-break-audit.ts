import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import { splitWorkForPayPeriod, type PayPeriodWorkPortion } from './pay-period.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';

export const RATE_BREAK_PREFIX = 'earnings_rate_boundary_break_v1:';
export const RATE_BREAK_MAX_REVISIONS = 64;

export interface RateBoundaryBreakEvent {
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
  portionStartUtc: string;
  portionEndUtc: string;
  portionBreakMinutes: number;
  beforeRateBreakMinutes: number;
  revision: number;
  recordedAt: string;
  reason: string;
}

type RateBreakRow = { key: string; value: string };
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export function rateBreakPrefix(workId: string, startDay: number, periodKey: string): string {
  if (!ID.test(workId)) throw new Error('INVALID_RATE_BREAK_WORK_ID');
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('INVALID_RATE_BREAK_START_DAY');
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodKey) || periodKey.startsWith('0000'))
    throw new Error('INVALID_RATE_BREAK_PERIOD');
  return RATE_BREAK_PREFIX + startDay + ':' + periodKey + ':' + workId + ':';
}

export function rateBreakHeadKey(workId: string, startDay: number, periodKey: string): string {
  return rateBreakPrefix(workId, startDay, periodKey) + 'head';
}

export function rateBreakEventKey(
  workId: string,
  startDay: number,
  periodKey: string,
  revision: number,
): string {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > RATE_BREAK_MAX_REVISIONS)
    throw new Error('RATE_BREAK_REVISION_LIMIT');
  return (
    rateBreakPrefix(workId, startDay, periodKey) + 'event:' + String(revision).padStart(3, '0')
  );
}

/**
 * Scope deliberately excludes work crossing BOTH a custom-pay-period boundary
 * and rate midnight. Such sources require two independent auditable break
 * decisions and must not inherit a guessed allocation.
 */
export function rateBreakSource(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
): {
  portion: PayPeriodWorkPortion;
  boundaryUtc: string;
  beforeSeconds: number;
  afterSeconds: number;
} {
  rateBreakPrefix(work.id, startDay, periodKey);
  validateEarningsWork(work);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])-01$/.test(effectiveDate) || effectiveDate.startsWith('0000'))
    throw new Error('INVALID_RATE_BREAK_EFFECTIVE_DATE');
  const portion = splitWorkForPayPeriod(work, periodKey, startDay);
  if (!portion || portion.splitAcrossPeriods)
    throw new Error('RATE_BREAK_REQUIRES_SINGLE_PAY_PERIOD_WORK');
  if (portion.breakMinutes <= 0) throw new Error('RATE_BREAK_REQUIRES_POSITIVE_BREAK');
  const boundary = resolveLocalBoundary(effectiveDate, '00:00', work.timeZone, 'reject');
  if (boundary.status !== 'resolved') throw new Error('RATE_BREAK_MIDNIGHT_UNRESOLVED');
  const boundaryMs = Date.parse(boundary.instantUtc);
  const startMs = Date.parse(portion.startInstantUtc);
  const endMs = Date.parse(portion.endInstantUtc);
  if (!(startMs < boundaryMs && boundaryMs < endMs))
    throw new Error('WORK_NOT_CROSS_RATE_BOUNDARY');
  return {
    portion,
    boundaryUtc: boundary.instantUtc,
    beforeSeconds: (boundaryMs - startMs) / 1000,
    afterSeconds: (endMs - boundaryMs) / 1000,
  };
}

export function createRateBreakEvent(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
  beforeRateBreakMinutes: number,
  revision: number,
  reason: string,
  recordedAt: string,
): RateBoundaryBreakEvent {
  const source = rateBreakSource(work, startDay, periodKey, effectiveDate);
  rateBreakEventKey(work.id, startDay, periodKey, revision);
  if (
    !Number.isSafeInteger(beforeRateBreakMinutes) ||
    beforeRateBreakMinutes < 0 ||
    beforeRateBreakMinutes > source.portion.breakMinutes ||
    beforeRateBreakMinutes * 60 > source.beforeSeconds ||
    (source.portion.breakMinutes - beforeRateBreakMinutes) * 60 > source.afterSeconds
  )
    throw new Error('RATE_BREAK_EXCEEDS_SEGMENT');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_RATE_BREAK_REASON');
  if (typeof recordedAt !== 'string' || !UTC.test(recordedAt))
    throw new Error('INVALID_RATE_BREAK_TIMESTAMP');
  const stamp = Date.parse(recordedAt);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== recordedAt)
    throw new Error('INVALID_RATE_BREAK_TIMESTAMP');

  return {
    schema: 1,
    source: 'user_entered',
    workId: work.id,
    startDay,
    periodKey,
    effectiveDate,
    rateBoundaryUtc: source.boundaryUtc,
    timeZone: work.timeZone,
    originalStartUtc: work.startInstantUtc,
    originalEndUtc: work.endInstantUtc,
    originalLocalDate: work.localDate,
    originalEndDate: work.endDate,
    originalBreakMinutes: work.breakMinutes,
    portionStartUtc: source.portion.startInstantUtc,
    portionEndUtc: source.portion.endInstantUtc,
    portionBreakMinutes: source.portion.breakMinutes,
    beforeRateBreakMinutes,
    revision,
    recordedAt,
    reason: reason.trim(),
  };
}

/** Canonical immutable readback (app-level append-only, not cryptographic). */
export function decodeRateBreakHistory(
  work: EarningsWork,
  startDay: number,
  periodKey: string,
  effectiveDate: string,
  rows: readonly RateBreakRow[],
): RateBoundaryBreakEvent[] {
  const prefix = rateBreakPrefix(work.id, startDay, periodKey);
  if (!Array.isArray(rows)) throw new Error('INVALID_RATE_BREAK_HISTORY');
  if (!rows.length) return [];
  if (rows.length > RATE_BREAK_MAX_REVISIONS + 1) throw new Error('RATE_BREAK_REVISION_LIMIT');
  const head = rows.filter((row) => row.key === prefix + 'head');
  const events = rows.filter((row) => row.key !== prefix + 'head');
  if (
    head.length !== 1 ||
    !/^[1-9][0-9]*$/.test(head[0].value) ||
    Number(head[0].value) !== events.length ||
    !events.length
  )
    throw new Error('INVALID_RATE_BREAK_HEAD');

  const history: RateBoundaryBreakEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const revision = index + 1;
    if (events[index].key !== rateBreakEventKey(work.id, startDay, periodKey, revision))
      throw new Error('RATE_BREAK_AUDIT_GAP');
    if (typeof events[index].value !== 'string' || events[index].value.length > 1500)
      throw new Error('INVALID_RATE_BREAK_EVENT');
    let parsed: RateBoundaryBreakEvent;
    try {
      parsed = JSON.parse(events[index].value) as RateBoundaryBreakEvent;
    } catch {
      throw new Error('INVALID_RATE_BREAK_EVENT');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_RATE_BREAK_EVENT');
    let canonical: RateBoundaryBreakEvent;
    try {
      canonical = createRateBreakEvent(
        work,
        startDay,
        periodKey,
        effectiveDate,
        parsed.beforeRateBreakMinutes,
        revision,
        parsed.reason,
        parsed.recordedAt,
      );
    } catch {
      throw new Error('INVALID_RATE_BREAK_EVENT');
    }
    if (JSON.stringify(canonical) !== events[index].value)
      throw new Error('INVALID_RATE_BREAK_EVENT');
    if (
      history.length &&
      (canonical.recordedAt < history[history.length - 1].recordedAt ||
        canonical.beforeRateBreakMinutes === history[history.length - 1].beforeRateBreakMinutes)
    )
      throw new Error('INVALID_RATE_BREAK_REVISION');
    history.push(canonical);
  }
  return history;
}
