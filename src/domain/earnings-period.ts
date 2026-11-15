import { calendarDateInZone } from './shift-engine.ts';
import { resolveLocalBoundary } from './zoned-shift-time.ts';
import type { EarningsWork } from './earnings-engine.ts';

/** One explicit choice for dividing a self-reported break between two months. */
export interface MonthBreakAllocation {
  workId: string;
  startPeriodKey: string;
  startMonthBreakMinutes: number;
  originalBreakMinutes: number;
  originalStartUtc: string;
  originalEndUtc: string;
  source: 'user_entered';
}

export interface WorkPeriodPortion {
  workId: string;
  startInstantUtc: string;
  endInstantUtc: string;
  grossSeconds: number;
  breakMinutes: number;
  netSeconds: number;
  originStartUtc: string;
  originEndUtc: string;
  originalLocalDate: string;
  timeZone: string;
  splitAcrossMonths: boolean;
}

const MONTH = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

function nextMonth(month: string): string {
  if (!MONTH.test(month)) throw new Error('INVALID_EARNINGS_PERIOD');
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (year === 9999 && number === 12) throw new Error('INVALID_EARNINGS_PERIOD');
  return (
    String(number === 12 ? year + 1 : year).padStart(4, '0') +
    '-' +
    String(number === 12 ? 1 : number + 1).padStart(2, '0')
  );
}

function monthBoundaryUtc(month: string, zone: string): number {
  const resolved = resolveLocalBoundary(month + '-01', '00:00', zone, 'reject');
  if (resolved.status !== 'resolved') throw new Error('UNRESOLVED_MONTH_BOUNDARY');
  return Date.parse(resolved.instantUtc);
}

/**
 * Both reports use the very same persisted UTC session and ORIGINAL IANA zone.
 * Never use phone timezone, elapsed wall minutes or inferred meal-break clock.
 * A break that crosses the month requires a user's explicit allocation.
 */
export function splitWorkForMonth(
  work: EarningsWork,
  periodKey: string,
  allocation?: MonthBreakAllocation,
): WorkPeriodPortion | null {
  if (!MONTH.test(periodKey)) throw new Error('INVALID_EARNINGS_PERIOD');
  const startMs = Date.parse(work.startInstantUtc);
  const endMs = Date.parse(work.endInstantUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs)
    throw new Error('INVALID_WORK_INTERVAL');
  const startDate = calendarDateInZone(work.timeZone, new Date(startMs));
  const endDate = calendarDateInZone(work.timeZone, new Date(endMs));
  if (startDate !== work.localDate || endDate !== work.endDate)
    throw new Error('WORK_DATE_ZONE_MISMATCH');
  const startMonth = startDate.slice(0, 7);
  const lastInstantMonth = calendarDateInZone(work.timeZone, new Date(endMs - 1)).slice(0, 7);
  if (lastInstantMonth < startMonth || lastInstantMonth > nextMonth(startMonth))
    throw new Error('WORK_SPANS_TOO_MANY_MONTHS');
  if (periodKey < startMonth || periodKey > lastInstantMonth) return null;

  const crosses = lastInstantMonth !== startMonth;
  const begin = Math.max(startMs, monthBoundaryUtc(periodKey, work.timeZone));
  const end = Math.min(endMs, monthBoundaryUtc(nextMonth(periodKey), work.timeZone));
  if (end <= begin) return null;
  const grossSeconds = (end - begin) / 1000;
  if (!Number.isSafeInteger(grossSeconds) || grossSeconds <= 0)
    throw new Error('INVALID_WORK_SPLIT');
  let breakMinutes = work.breakMinutes;
  if (crosses) {
    if (work.breakMinutes === 0) {
      if (allocation) throw new Error('UNEXPECTED_BREAK_ALLOCATION');
      breakMinutes = 0;
    } else {
      if (!allocation) throw new Error('BREAK_ALLOCATION_REQUIRED');
      if (
        allocation.source !== 'user_entered' ||
        allocation.workId !== work.id ||
        allocation.startPeriodKey !== startMonth ||
        allocation.originalBreakMinutes !== work.breakMinutes ||
        allocation.originalStartUtc !== work.startInstantUtc ||
        allocation.originalEndUtc !== work.endInstantUtc ||
        !Number.isSafeInteger(allocation.startMonthBreakMinutes) ||
        allocation.startMonthBreakMinutes < 0 ||
        allocation.startMonthBreakMinutes > work.breakMinutes
      )
        throw new Error('INVALID_BREAK_ALLOCATION');
      const boundary = monthBoundaryUtc(lastInstantMonth, work.timeZone);
      const firstGross = (boundary - startMs) / 1000;
      const secondGross = (endMs - boundary) / 1000;
      const otherBreak = work.breakMinutes - allocation.startMonthBreakMinutes;
      if (allocation.startMonthBreakMinutes * 60 > firstGross || otherBreak * 60 > secondGross)
        throw new Error('BREAK_ALLOCATION_EXCEEDS_SEGMENT');
      breakMinutes = periodKey === startMonth ? allocation.startMonthBreakMinutes : otherBreak;
    }
  } else if (allocation) {
    throw new Error('UNEXPECTED_BREAK_ALLOCATION');
  }
  const netSeconds = grossSeconds - breakMinutes * 60;
  if (netSeconds < 0 || !Number.isSafeInteger(netSeconds))
    throw new Error('INVALID_WORK_SPLIT');
  return {
    workId: work.id,
    startInstantUtc: new Date(begin).toISOString(),
    endInstantUtc: new Date(end).toISOString(),
    grossSeconds,
    breakMinutes,
    netSeconds,
    originStartUtc: work.startInstantUtc,
    originEndUtc: work.endInstantUtc,
    originalLocalDate: work.localDate,
    timeZone: work.timeZone,
    splitAcrossMonths: crosses,
  };
}
