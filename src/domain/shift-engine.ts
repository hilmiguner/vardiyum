/**
 * Calendar-day arithmetic intentionally uses UTC calendar ordinal numbers instead
 * of elapsed local milliseconds. A DST transition must not shift the cycle index.
 * The shift's scheduled working interval is modeled separately from its anchor day.
 */
export type ShiftCode = 'morning' | 'evening' | 'night' | 'off';

export interface ShiftPattern {
  anchorDate: string; // YYYY-MM-DD, calendar date in the schedule's timezone
  days: readonly ShiftCode[];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function calendarOrdinal(isoDate: string): number {
  const match = ISO_DATE.exec(isoDate);
  if (!match) throw new Error('INVALID_DATE');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(0);
  utc.setUTCHours(0, 0, 0, 0);
  utc.setUTCFullYear(year, month - 1, day);
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) throw new Error('INVALID_DATE');
  return Math.floor(utc.getTime() / 86_400_000);
}

export function cycleIndex(date: string, pattern: ShiftPattern): number {
  if (pattern.days.length === 0) throw new Error('EMPTY_PATTERN');
  const offset = calendarOrdinal(date) - calendarOrdinal(pattern.anchorDate);
  return ((offset % pattern.days.length) + pattern.days.length) % pattern.days.length;
}

export function scheduledShift(date: string, pattern: ShiftPattern): ShiftCode {
  return pattern.days[cycleIndex(date, pattern)];
}

/** Dates here are civil calendar dates, not timestamps. */
export function addCalendarDays(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) throw new Error('INVALID_OFFSET');
  const utc = new Date((calendarOrdinal(date) + days) * 86_400_000);
  const y = String(utc.getUTCFullYear()).padStart(4, '0');
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localDateString(date: Date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validatePattern(value: ShiftPattern): ShiftPattern {
  calendarOrdinal(value.anchorDate);
  if (value.days.length < 1 || value.days.length > 366) throw new Error('INVALID_PATTERN_LENGTH');
  const allowed: ShiftCode[] = ['morning', 'evening', 'night', 'off'];
  if (!value.days.every((code) => allowed.includes(code))) throw new Error('INVALID_SHIFT');
  return { anchorDate: value.anchorDate, days: [...value.days] };
}

export const SAMPLE_PATTERN: ShiftPattern = {
  anchorDate: '2026-11-15',
  days: ['morning', 'morning', 'evening', 'evening', 'night', 'night', 'off', 'off'],
};
