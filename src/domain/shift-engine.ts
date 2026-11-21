/**
 * Calendar-day arithmetic intentionally uses UTC calendar ordinal numbers instead
 * of elapsed local milliseconds. A DST transition must not shift the cycle index.
 * The shift's scheduled working interval is modeled separately from its anchor day.
 */
export type ShiftCode = 'morning' | 'evening' | 'night' | 'off';
export type ShiftId = string;

export interface ShiftPattern {
  anchorDate: string; // YYYY-MM-DD, calendar date in the schedule's timezone
  days: readonly ShiftId[];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SHIFT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;

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
  )
    throw new Error('INVALID_DATE');
  return Math.floor(utc.getTime() / 86_400_000);
}

export function cycleIndex(date: string, pattern: ShiftPattern): number {
  if (pattern.days.length === 0) throw new Error('EMPTY_PATTERN');
  const offset = calendarOrdinal(date) - calendarOrdinal(pattern.anchorDate);
  return ((offset % pattern.days.length) + pattern.days.length) % pattern.days.length;
}

export function scheduledShift(date: string, pattern: ShiftPattern): ShiftId {
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
  if (value.days.length < 1 || value.days.length > 366)
    throw new Error('INVALID_PATTERN_LENGTH');
  if (!value.days.every((id) => SHIFT_ID.test(id))) throw new Error('INVALID_SHIFT');
  return { anchorDate: value.anchorDate, days: [...value.days] };
}

export const SAMPLE_PATTERN: ShiftPattern = {
  anchorDate: '2026-11-15',
  days: ['morning', 'morning', 'evening', 'evening', 'night', 'night', 'off', 'off'],
};

/**
 * A template is a scheduled *wall-clock* interval. `endDayOffset: 1` means
 * the ending clock time occurs on the next calendar day.
 * Actual elapsed minutes across DST transitions are intentionally NOT inferred.
 */
export interface ShiftTemplate {
  id: ShiftId;
  name: string;
  color: string;
  startsAt: string | null;
  endsAt: string | null;
  endDayOffset: 0 | 1;
  breakMinutes: number;
  isRestDay: boolean;
}
export interface DayOverride {
  date: string;
  shiftId: ShiftId;
  note: string;
}
export interface ShiftSchedule {
  pattern: ShiftPattern | null;
  templates: readonly ShiftTemplate[];
  overrides: Readonly<Record<string, DayOverride>>;
  timeZone: string;
}
export interface ResolvedShift {
  date: string;
  template: ShiftTemplate;
  source: 'cycle' | 'override';
  note: string;
}

export const DEFAULT_TEMPLATES: readonly ShiftTemplate[] = [
  {
    id: 'morning',
    name: 'Sabah',
    color: '#56A3FF',
    startsAt: '07:00',
    endsAt: '15:00',
    endDayOffset: 0,
    breakMinutes: 0,
    isRestDay: false,
  },
  {
    id: 'evening',
    name: 'Akşam',
    color: '#E8A86E',
    startsAt: '15:00',
    endsAt: '23:00',
    endDayOffset: 0,
    breakMinutes: 0,
    isRestDay: false,
  },
  {
    id: 'night',
    name: 'Gece',
    color: '#A18CF6',
    startsAt: '23:00',
    endsAt: '07:00',
    endDayOffset: 1,
    breakMinutes: 0,
    isRestDay: false,
  },
  {
    id: 'off',
    name: 'İzin',
    color: '#5EC59C',
    startsAt: null,
    endsAt: null,
    endDayOffset: 0,
    breakMinutes: 0,
    isRestDay: true,
  },
];

/** Return the planned wall-clock interval, without DST elapsed-time assumptions. */
export function plannedWallMinutes(template: ShiftTemplate): number {
  if (template.isRestDay) return 0;
  if (!template.startsAt || !template.endsAt) throw new Error('INVALID_SHIFT_TIME');
  const toMinutes = (value: string): number => {
    if (!TIME.test(value)) throw new Error('INVALID_SHIFT_TIME');
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  return (
    toMinutes(template.endsAt) - toMinutes(template.startsAt) + template.endDayOffset * 1440
  );
}

export function validateTemplate(input: ShiftTemplate): ShiftTemplate {
  if (!SHIFT_ID.test(input.id)) throw new Error('INVALID_SHIFT_ID');
  const name = input.name.trim();
  if (!name || name.length > 40) throw new Error('INVALID_SHIFT_NAME');
  if (!COLOR.test(input.color)) throw new Error('INVALID_SHIFT_COLOR');
  if (input.endDayOffset !== 0 && input.endDayOffset !== 1)
    throw new Error('INVALID_DAY_OFFSET');
  if (!Number.isSafeInteger(input.breakMinutes) || input.breakMinutes < 0)
    throw new Error('INVALID_BREAK_MINUTES');
  if (input.isRestDay) {
    if (
      input.startsAt !== null ||
      input.endsAt !== null ||
      input.endDayOffset !== 0 ||
      input.breakMinutes !== 0
    )
      throw new Error('INVALID_REST_SHIFT');
  } else {
    const duration = plannedWallMinutes(input);
    if (duration < 1 || duration > 1440 || input.breakMinutes >= duration)
      throw new Error('INVALID_SHIFT_DURATION');
  }
  return { ...input, name };
}

export function validateScheduleConfig(
  pattern: ShiftPattern,
  templates: readonly ShiftTemplate[],
): { pattern: ShiftPattern; templates: ShiftTemplate[] } {
  const verifiedPattern = validatePattern(pattern);
  if (templates.length < 1 || templates.length > 100) throw new Error('INVALID_TEMPLATE_COUNT');
  const verifiedTemplates = templates.map(validateTemplate);
  const keys = new Set(verifiedTemplates.map((template) => template.id));
  if (keys.size !== templates.length) throw new Error('DUPLICATE_SHIFT_ID');
  if (!verifiedPattern.days.every((id) => keys.has(id))) throw new Error('UNKNOWN_SHIFT');
  return { pattern: verifiedPattern, templates: verifiedTemplates };
}

export function validateOverride(
  date: string,
  shiftId: string,
  note: string,
  templates: readonly ShiftTemplate[],
): DayOverride {
  calendarOrdinal(date);
  if (!templates.some((t) => t.id === shiftId)) throw new Error('UNKNOWN_SHIFT');
  if (note.length > 120) throw new Error('OVERRIDE_NOTE_TOO_LONG');
  return { date, shiftId, note: note.trim() };
}

export function resolveShift(date: string, schedule: ShiftSchedule): ResolvedShift | null {
  calendarOrdinal(date);
  if (!schedule.pattern) return null;
  const override = schedule.overrides[date];
  const id = override?.shiftId ?? scheduledShift(date, schedule.pattern);
  const template = schedule.templates.find((entry) => entry.id === id);
  if (!template) throw new Error('UNKNOWN_SHIFT');
  return {
    date,
    template,
    source: override ? 'override' : 'cycle',
    note: override?.note ?? '',
  };
}

/** One month ahead/back while keeping the day pinned to the first of the month. */
export function moveMonth(monthStart: string, amount: number): string {
  if (!Number.isSafeInteger(amount)) throw new Error('INVALID_OFFSET');
  const match = ISO_DATE.exec(monthStart);
  calendarOrdinal(monthStart);
  if (!match || match[3] !== '01') throw new Error('INVALID_MONTH');
  const d = new Date(0);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCFullYear(Number(match[1]), Number(match[2]) - 1 + amount, 1);
  return addCalendarDays(
    `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`,
    0,
  );
}

export function calendarDateInZone(timeZone: string, instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const piece = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const date = `${piece('year')}-${piece('month')}-${piece('day')}`;
  calendarOrdinal(date);
  return date;
}

/** Keep the render clock stable until the saved schedule zone changes civil day. */
export function refreshCalendarClockInstant(
  previousInstant: number,
  currentInstant: number,
  timeZone: string,
): number {
  const previousDay = calendarDateInZone(timeZone, new Date(previousInstant));
  const currentDay = calendarDateInZone(timeZone, new Date(currentInstant));
  return previousDay === currentDay ? previousInstant : currentInstant;
}
