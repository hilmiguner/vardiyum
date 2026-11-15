import { addCalendarDays, calendarDateInZone, calendarOrdinal } from './shift-engine.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';
import type { EarningsWork } from './earnings-engine.ts';

/**
 * The period key is the month in which the selected start day occurs.
 * A 26 -> 25 payroll window is keyed by its 26th, e.g. 2026-10.
 * Day 1 retains the existing calendar-month semantics.
 */
export interface CustomPayPeriod {
  periodKey: string;
  startDay: number;
  startDate: string;
  endDateInclusive: string;
  endExclusiveDate: string;
}

export interface ZonedPayPeriod extends CustomPayPeriod {
  timeZone: string;
  startInstantUtc: string;
  endInstantUtc: string;
}

/** A separate, source-bound break choice: never reuse a calendar-month allocation. */
export interface PayPeriodBreakAllocation {
  workId: string;
  startPeriodKey: string;
  startPeriodBreakMinutes: number;
  originalBreakMinutes: number;
  originalStartUtc: string;
  originalEndUtc: string;
  source: 'user_entered';
}

export interface PayPeriodWorkPortion {
  workId: string;
  periodKey: string;
  startInstantUtc: string;
  endInstantUtc: string;
  grossSeconds: number;
  breakMinutes: number;
  netSeconds: number;
  originStartUtc: string;
  originEndUtc: string;
  originalLocalDate: string;
  timeZone: string;
  splitAcrossPeriods: boolean;
}

const MONTH = /^([0-9]{4})-(0[1-9]|1[0-2])$/;
const UTC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

function checkStartDay(day: number): void {
  // Never silently clamp a 29th/30th/31st into February.
  if (!Number.isSafeInteger(day) || day < 1 || day > 28)
    throw new Error('INVALID_PAY_PERIOD_START_DAY');
}

function shiftMonth(key: string, amount: -1 | 1): string {
  const match = MONTH.exec(key);
  if (!match) throw new Error('INVALID_PAY_PERIOD_KEY');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || year > 9999) throw new Error('INVALID_PAY_PERIOD_KEY');
  const index = year * 12 + month - 1 + amount;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = (index % 12) + 1;
  if (shiftedYear < 1 || shiftedYear > 9999)
    throw new Error('PAY_PERIOD_OUT_OF_RANGE');
  return String(shiftedYear).padStart(4, '0') + '-' + String(shiftedMonth).padStart(2, '0');
}

/** ISO civil dates only; no device clock or time-zone dependency. */
export function payPeriodForDate(date: string, startDay: number): string {
  checkStartDay(startDay);
  calendarOrdinal(date);
  const month = date.slice(0, 7);
  return Number(date.slice(8, 10)) >= startDay ? month : shiftMonth(month, -1);
}

export function customPayPeriodBounds(periodKey: string, startDay: number): CustomPayPeriod {
  checkStartDay(startDay);
  const match = MONTH.exec(periodKey);
  if (!match || Number(match[1]) < 1) throw new Error('INVALID_PAY_PERIOD_KEY');
  const next = shiftMonth(periodKey, 1);
  const suffix = '-' + String(startDay).padStart(2, '0');
  const startDate = periodKey + suffix;
  const endExclusiveDate = next + suffix;
  calendarOrdinal(startDate);
  calendarOrdinal(endExclusiveDate);
  return {
    periodKey,
    startDay,
    startDate,
    endDateInclusive: addCalendarDays(endExclusiveDate, -1),
    endExclusiveDate,
  };
}

/**
 * A period begins and ends at 00:00 in its saved IANA zone.
 * DST gaps/folds at midnight are never resolved by an implicit choice.
 */
export function zonedPayPeriodBounds(
  periodKey: string,
  startDay: number,
  timeZone: string,
): ZonedPayPeriod {
  const bounds = customPayPeriodBounds(periodKey, startDay);
  const start = resolveLocalBoundary(bounds.startDate, '00:00', timeZone, 'reject');
  const end = resolveLocalBoundary(bounds.endExclusiveDate, '00:00', timeZone, 'reject');
  if (start.status !== 'resolved' || end.status !== 'resolved')
    throw new Error('UNRESOLVED_PAY_PERIOD_BOUNDARY');
  if (Date.parse(start.instantUtc) >= Date.parse(end.instantUtc))
    throw new Error('INVALID_PAY_PERIOD_INTERVAL');
  return {
    ...bounds,
    timeZone,
    startInstantUtc: start.instantUtc,
    endInstantUtc: end.instantUtc,
  };
}

function exactUtc(value: string): number {
  if (typeof value !== 'string' || !UTC.test(value))
    throw new Error('INVALID_PAY_PERIOD_WORK');
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value)
    throw new Error('INVALID_PAY_PERIOD_WORK');
  return timestamp;
}

/**
 * Partitions the ORIGINAL UTC interval; only user-reported actual work is used.
 * Nonzero breaks crossing a configured boundary require a NEW explicit allocation
 * tied to source timestamps and the start-period key. Never guess break timing.
 *
 * This is a standalone domain primitive: existing month reports and SQLite v8
 * must continue to use their original allocator until a separately reviewed
 * repository/UI integration supplies durable custom-period break provenance.
 */
export function splitWorkForPayPeriod(
  work: EarningsWork,
  periodKey: string,
  startDay: number,
  allocation?: PayPeriodBreakAllocation,
): PayPeriodWorkPortion | null {
  checkStartDay(startDay);
  const startMs = exactUtc(work.startInstantUtc);
  const endMs = exactUtc(work.endInstantUtc);
  const grossSeconds = (endMs - startMs) / 1000;
  if (
    !Number.isSafeInteger(grossSeconds) ||
    grossSeconds <= 0 ||
    grossSeconds > 72 * 3600 ||
    !Number.isSafeInteger(work.breakMinutes) ||
    work.breakMinutes < 0 ||
    work.breakMinutes * 60 >= grossSeconds ||
    work.source !== 'user_entered'
  )
    throw new Error('INVALID_PAY_PERIOD_WORK');
  calendarOrdinal(work.localDate);
  calendarOrdinal(work.endDate);
  const firstDate = calendarDateInZone(work.timeZone, new Date(startMs));
  const lastDate = calendarDateInZone(work.timeZone, new Date(endMs - 1));
  const endDate = calendarDateInZone(work.timeZone, new Date(endMs));
  if (firstDate !== work.localDate || endDate !== work.endDate)
    throw new Error('PAY_PERIOD_WORK_ZONE_MISMATCH');
  const firstKey = payPeriodForDate(firstDate, startDay);
  const lastKey = payPeriodForDate(lastDate, startDay);
  const crosses = firstKey !== lastKey;
  if (crosses && shiftMonth(firstKey, 1) !== lastKey)
    throw new Error('WORK_SPANS_TOO_MANY_PAY_PERIODS');
  if (periodKey !== firstKey && periodKey !== lastKey) {
    customPayPeriodBounds(periodKey, startDay);
    return null;
  }

  const bounds = zonedPayPeriodBounds(periodKey, startDay, work.timeZone);
  const clippedStart = Math.max(startMs, Date.parse(bounds.startInstantUtc));
  const clippedEnd = Math.min(endMs, Date.parse(bounds.endInstantUtc));
  const segmentSeconds = (clippedEnd - clippedStart) / 1000;
  if (!Number.isSafeInteger(segmentSeconds) || segmentSeconds <= 0)
    throw new Error('INVALID_PAY_PERIOD_SPLIT');

  let breakMinutes = work.breakMinutes;
  if (crosses) {
    if (work.breakMinutes === 0) {
      if (allocation) throw new Error('UNEXPECTED_PAY_PERIOD_BREAK_ALLOCATION');
      breakMinutes = 0;
    } else {
      if (!allocation) throw new Error('PAY_PERIOD_BREAK_ALLOCATION_REQUIRED');
      if (
        allocation.source !== 'user_entered' ||
        allocation.workId !== work.id ||
        allocation.startPeriodKey !== firstKey ||
        allocation.originalBreakMinutes !== work.breakMinutes ||
        allocation.originalStartUtc !== work.startInstantUtc ||
        allocation.originalEndUtc !== work.endInstantUtc ||
        !Number.isSafeInteger(allocation.startPeriodBreakMinutes) ||
        allocation.startPeriodBreakMinutes < 0 ||
        allocation.startPeriodBreakMinutes > work.breakMinutes
      )
        throw new Error('INVALID_PAY_PERIOD_BREAK_ALLOCATION');
      const firstEnd = zonedPayPeriodBounds(firstKey, startDay, work.timeZone).endInstantUtc;
      const boundaryMs = Date.parse(firstEnd);
      const firstSeconds = (boundaryMs - startMs) / 1000;
      const secondSeconds = (endMs - boundaryMs) / 1000;
      const secondBreak = work.breakMinutes - allocation.startPeriodBreakMinutes;
      if (
        allocation.startPeriodBreakMinutes * 60 > firstSeconds ||
        secondBreak * 60 > secondSeconds
      )
        throw new Error('PAY_PERIOD_BREAK_EXCEEDS_SEGMENT');
      breakMinutes = periodKey === firstKey ? allocation.startPeriodBreakMinutes : secondBreak;
    }
  } else if (allocation) {
    throw new Error('UNEXPECTED_PAY_PERIOD_BREAK_ALLOCATION');
  }

  const netSeconds = segmentSeconds - breakMinutes * 60;
  if (!Number.isSafeInteger(netSeconds) || netSeconds < 0)
    throw new Error('INVALID_PAY_PERIOD_SPLIT');
  return {
    workId: work.id,
    periodKey,
    startInstantUtc: new Date(clippedStart).toISOString(),
    endInstantUtc: new Date(clippedEnd).toISOString(),
    grossSeconds: segmentSeconds,
    breakMinutes,
    netSeconds,
    originStartUtc: work.startInstantUtc,
    originEndUtc: work.endInstantUtc,
    originalLocalDate: work.localDate,
    timeZone: work.timeZone,
    splitAcrossPeriods: crosses,
  };
}
