import { calendarDateInZone } from './shift-engine.ts';
import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import {
  payPeriodForDate,
  splitWorkForPayPeriod,
  type PayPeriodBreakAllocation,
} from './pay-period.ts';

/**
 * SQLite v8 app_settings event namespace. No new tables or incompatible
 * encrypted-backup schema: each historical revision is a separate INSERT-only
 * key; the head key is updated transactionally with the new event.
 */
export const CUSTOM_PAY_BREAK_PREFIX = 'earnings_custom_pay_break_v1:';
export const CUSTOM_PAY_BREAK_MAX_REVISIONS = 64;

export interface CustomPayBreakEvent extends PayPeriodBreakAllocation {
  schema: 1;
  startDay: number;
  revision: number;
  recordedAt: string;
  reason: string;
  timeZone: string;
  originalLocalDate: string;
  originalEndDate: string;
}

export interface CustomPayBreakRow {
  key: string;
  value: string;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const CANONICAL_UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export function customBreakPrefix(workId: string, startDay: number): string {
  if (!IDENTIFIER.test(workId)) throw new Error('INVALID_CUSTOM_BREAK_WORK_ID');
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('CUSTOM_BREAK_REQUIRES_NONCALENDAR_PERIOD');
  return CUSTOM_PAY_BREAK_PREFIX + startDay + ':' + workId + ':';
}

export function customBreakHeadKey(workId: string, startDay: number): string {
  return customBreakPrefix(workId, startDay) + 'head';
}

export function customBreakEventKey(
  workId: string,
  startDay: number,
  revision: number,
): string {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    revision > CUSTOM_PAY_BREAK_MAX_REVISIONS
  )
    throw new Error('CUSTOM_BREAK_REVISION_LIMIT');
  return customBreakPrefix(workId, startDay) + 'event:' + String(revision).padStart(3, '0');
}

export function customBreakSourcePeriods(
  work: EarningsWork,
  startDay: number,
): { first: string; last: string } {
  customBreakPrefix(work.id, startDay);
  validateEarningsWork(work);
  const startMs = Date.parse(work.startInstantUtc);
  const endMs = Date.parse(work.endInstantUtc);
  const firstDate = calendarDateInZone(work.timeZone, new Date(startMs));
  const lastDate = calendarDateInZone(work.timeZone, new Date(endMs - 1));
  if (
    firstDate !== work.localDate ||
    calendarDateInZone(work.timeZone, new Date(endMs)) !== work.endDate
  )
    throw new Error('CUSTOM_BREAK_WORK_ZONE_MISMATCH');
  const first = payPeriodForDate(firstDate, startDay);
  const last = payPeriodForDate(lastDate, startDay);
  if (first === last || work.breakMinutes === 0)
    throw new Error('WORK_NOT_CROSS_CUSTOM_PAY_PERIOD_BREAK');
  return { first, last };
}

/** Revalidate BOTH sides against original UTC seconds before creating an event. */
export function createCustomBreakEvent(
  work: EarningsWork,
  startDay: number,
  startPeriodBreakMinutes: number,
  revision: number,
  reason: string,
  recordedAt: string,
): CustomPayBreakEvent {
  const keys = customBreakSourcePeriods(work, startDay);
  customBreakEventKey(work.id, startDay, revision);
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_CUSTOM_BREAK_REASON');
  if (typeof recordedAt !== 'string' || !CANONICAL_UTC.test(recordedAt))
    throw new Error('INVALID_CUSTOM_BREAK_TIMESTAMP');
  const stamp = Date.parse(recordedAt);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== recordedAt)
    throw new Error('INVALID_CUSTOM_BREAK_TIMESTAMP');
  const allocation: PayPeriodBreakAllocation = {
    workId: work.id,
    startPeriodKey: keys.first,
    startPeriodBreakMinutes,
    originalBreakMinutes: work.breakMinutes,
    originalStartUtc: work.startInstantUtc,
    originalEndUtc: work.endInstantUtc,
    source: 'user_entered',
  };
  const left = splitWorkForPayPeriod(work, keys.first, startDay, allocation);
  const right = splitWorkForPayPeriod(work, keys.last, startDay, allocation);
  if (
    !left ||
    !right ||
    left.endInstantUtc !== right.startInstantUtc ||
    left.netSeconds + right.netSeconds !==
      (Date.parse(work.endInstantUtc) - Date.parse(work.startInstantUtc)) / 1000 -
        work.breakMinutes * 60
  )
    throw new Error('CUSTOM_BREAK_PARTITION_MISMATCH');
  return {
    schema: 1,
    startDay,
    workId: work.id,
    startPeriodKey: keys.first,
    startPeriodBreakMinutes,
    originalBreakMinutes: work.breakMinutes,
    originalStartUtc: work.startInstantUtc,
    originalEndUtc: work.endInstantUtc,
    source: 'user_entered',
    revision,
    recordedAt,
    reason: reason.trim(),
    timeZone: work.timeZone,
    originalLocalDate: work.localDate,
    originalEndDate: work.endDate,
  };
}

/**
 * Strict readback: detects missing head/event, revision gaps, foreign keys in
 * this namespace, changed source UTC values, stale period choices and tampered
 * canonical JSON. This is an app-level append-only audit, not a cryptographic
 * anti-tamper claim about a directly writable SQLite file.
 */
export function decodeCustomBreakHistory(
  work: EarningsWork,
  startDay: number,
  rows: readonly CustomPayBreakRow[],
): CustomPayBreakEvent[] {
  const prefix = customBreakPrefix(work.id, startDay);
  if (!Array.isArray(rows)) throw new Error('INVALID_CUSTOM_BREAK_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > CUSTOM_PAY_BREAK_MAX_REVISIONS + 1)
    throw new Error('CUSTOM_BREAK_REVISION_LIMIT');

  const head = rows.filter((row) => row.key === prefix + 'head');
  if (head.length !== 1) throw new Error('CUSTOM_BREAK_HEAD_MISSING');
  const events = rows.filter((row) => row.key !== prefix + 'head');
  if (
    events.length === 0 ||
    !/^[1-9][0-9]*$/.test(head[0].value) ||
    Number(head[0].value) !== events.length
  )
    throw new Error('INVALID_CUSTOM_BREAK_HEAD');

  const result: CustomPayBreakEvent[] = [];
  for (let index = 0; index < events.length; index++) {
    const revision = index + 1;
    const row = events[index];
    if (row.key !== customBreakEventKey(work.id, startDay, revision))
      throw new Error('CUSTOM_BREAK_AUDIT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 1500)
      throw new Error('INVALID_CUSTOM_BREAK_EVENT');
    let parsed: CustomPayBreakEvent;
    try {
      parsed = JSON.parse(row.value) as CustomPayBreakEvent;
    } catch {
      throw new Error('INVALID_CUSTOM_BREAK_EVENT');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_CUSTOM_BREAK_EVENT');
    let canonical: CustomPayBreakEvent;
    try {
      canonical = createCustomBreakEvent(
        work,
        startDay,
        parsed.startPeriodBreakMinutes,
        revision,
        parsed.reason,
        parsed.recordedAt,
      );
    } catch {
      throw new Error('INVALID_CUSTOM_BREAK_EVENT');
    }
    if (JSON.stringify(canonical) !== row.value) throw new Error('INVALID_CUSTOM_BREAK_EVENT');
    if (
      result.length &&
      (canonical.recordedAt < result[result.length - 1].recordedAt ||
        canonical.startPeriodBreakMinutes === result[result.length - 1].startPeriodBreakMinutes)
    )
      throw new Error('INVALID_CUSTOM_BREAK_REVISION');
    result.push(canonical);
  }
  return result;
}
