import {
  addCalendarDays,
  calendarOrdinal,
  plannedWallMinutes,
  type ShiftTemplate,
  validateTemplate,
} from './shift-engine';

/**
 * A local clock value may map to zero instants (DST gap), one instant, or two
 * instants (DST fold). Never let the host device timezone choose silently.
 */
export type FoldChoice = 'reject' | 'earlier' | 'later';
export interface BoundaryPolicy {
  start: FoldChoice;
  end: FoldChoice;
}
export const STRICT_BOUNDARY_POLICY: Readonly<BoundaryPolicy> = Object.freeze({
  start: 'reject',
  end: 'reject',
});

export type LocalBoundary =
  | { status: 'resolved'; instantUtc: string; interpretation: 'unique' | 'earlier' | 'later' }
  | { status: 'ambiguous'; optionsUtc: readonly string[] }
  | { status: 'nonexistent' };

export type IntervalIssue =
  | 'NONEXISTENT_START'
  | 'NONEXISTENT_END'
  | 'AMBIGUOUS_START'
  | 'AMBIGUOUS_END'
  | 'END_NOT_AFTER_START';

export type ShiftInterval =
  | { status: 'rest'; wallMinutes: 0; elapsedSeconds: 0 }
  | {
      status: 'unresolved';
      reason: IntervalIssue;
      wallMinutes: number;
      boundaryOptionsUtc?: readonly string[];
    }
  | {
      status: 'resolved';
      timeZone: string;
      startInstantUtc: string;
      endInstantUtc: string;
      startInterpretation: 'unique' | 'earlier' | 'later';
      endInterpretation: 'unique' | 'earlier' | 'later';
      wallMinutes: number;
      elapsedSeconds: number;
      /** Gross elapsed time only. Never automatically deduct the planned break. */
      breakMinutesPlanned: number;
    };

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ZONE = /^[A-Za-z][A-Za-z0-9_.+-]*(?:\/[A-Za-z0-9_.+-]+)*$/;
const HOUR_MS = 3_600_000;

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function utcMilliseconds(parts: Parts): number {
  const d = new Date(0);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  d.setUTCHours(parts.hour, parts.minute, parts.second, 0);
  const result = d.getTime();
  if (!Number.isFinite(result)) throw new Error('INVALID_LOCAL_TIME');
  return result;
}

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  // Offset-only identifiers are deliberately excluded: schedules store an
  // IANA zone whose rules include historical and future UTC offset changes.
  if (!ZONE.test(timeZone)) throw new Error('INVALID_TIME_ZONE');
  try {
    return new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new Error('INVALID_TIME_ZONE');
  }
}

function zonedParts(formatter: Intl.DateTimeFormat, instantMs: number): Parts {
  const parts = formatter.formatToParts(new Date(instantMs));
  const number = (key: string) => {
    const value = parts.find((part) => part.type === key)?.value;
    if (!value || !/^\d+$/.test(value)) throw new Error('UNSUPPORTED_TIME_ZONE_FORMAT');
    return Number(value);
  };
  return {
    year: number('year'),
    month: number('month'),
    day: number('day'),
    hour: number('hour'),
    minute: number('minute'),
    second: number('second'),
  };
}

function equalParts(a: Parts, b: Parts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Finds all exact UTC instants matching a local minute.
 *
 * We sample the UTC offsets in a bounded 72-hour window around the naïve UTC
 * wall time, then round-trip each offset-derived candidate through Intl.
 * The candidate search handles fractional-hour and historical second offsets.
 * Unlike Date's local parsing, this never silently rolls a gap forward or
 * picks one side of a repeated local time.
 *
 * Designed for ordinary IANA civil-time transitions (offset ranges +/- 24h).
 * Every future payroll-relevant conversion still needs mobile runtime tests.
 */
export function possibleUtcInstants(
  localDate: string,
  clock: string,
  timeZone: string,
): readonly string[] {
  calendarOrdinal(localDate);
  const match = CLOCK.exec(clock);
  if (!match) throw new Error('INVALID_SHIFT_TIME');
  const [year, month, day] = localDate.split('-').map(Number);
  const target: Parts = {
    year,
    month,
    day,
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: 0,
  };
  const nominal = utcMilliseconds(target);
  const formatter = zoneFormatter(timeZone);
  const offsets = new Set<number>();

  // An offset is stable around the wall-time boundary except at transitions.
  // Hourly samples detect ordinary DST fold/gap and non-whole-hour jumps.
  for (let hour = -36; hour <= 36; hour++) {
    const sampledInstant = nominal + hour * HOUR_MS;
    const localAtSample = zonedParts(formatter, sampledInstant);
    offsets.add(utcMilliseconds(localAtSample) - sampledInstant);
  }
  const matches: number[] = [];
  for (const offset of offsets) {
    const candidate = nominal - offset;
    if (equalParts(zonedParts(formatter, candidate), target)) {
      matches.push(candidate);
    }
  }
  return [...new Set(matches)].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString());
}

/**
 * Explicit policy for a fold: default REJECT, or choose its first/last instant.
 * A gap is always rejected: moving a nonexistent clock time is never implicit.
 */
export function resolveLocalBoundary(
  localDate: string,
  clock: string,
  timeZone: string,
  choice: FoldChoice = 'reject',
): LocalBoundary {
  if (!['reject', 'earlier', 'later'].includes(choice)) throw new Error('INVALID_FOLD_POLICY');
  const options = possibleUtcInstants(localDate, clock, timeZone);
  if (options.length === 0) return { status: 'nonexistent' };
  if (options.length === 1) {
    return { status: 'resolved', instantUtc: options[0], interpretation: 'unique' };
  }
  if (choice === 'reject') return { status: 'ambiguous', optionsUtc: options };
  const selected = choice === 'earlier' ? options[0] : options[options.length - 1];
  return { status: 'resolved', instantUtc: selected, interpretation: choice };
}

/**
 * Resolves the scheduled wall clock interval into real UTC instants.
 * If any endpoint is ambiguous/nonexistent, the caller must not use this for
 * earnings until an explicit endpoint policy has resolved it.
 */
export function resolveShiftInterval(
  localDate: string,
  template: ShiftTemplate,
  timeZone: string,
  policy: Readonly<BoundaryPolicy> = STRICT_BOUNDARY_POLICY,
): ShiftInterval {
  calendarOrdinal(localDate);
  const validated = validateTemplate(template);
  if (validated.isRestDay) return { status: 'rest', wallMinutes: 0, elapsedSeconds: 0 };
  const wallMinutes = plannedWallMinutes(validated);
  const start = resolveLocalBoundary(localDate, validated.startsAt!, timeZone, policy.start);
  if (start.status !== 'resolved') {
    return {
      status: 'unresolved',
      wallMinutes,
      reason: start.status === 'nonexistent' ? 'NONEXISTENT_START' : 'AMBIGUOUS_START',
      ...(start.status === 'ambiguous' ? { boundaryOptionsUtc: start.optionsUtc } : {}),
    };
  }
  const endDate = addCalendarDays(localDate, validated.endDayOffset);
  const end = resolveLocalBoundary(endDate, validated.endsAt!, timeZone, policy.end);
  if (end.status !== 'resolved') {
    return {
      status: 'unresolved',
      wallMinutes,
      reason: end.status === 'nonexistent' ? 'NONEXISTENT_END' : 'AMBIGUOUS_END',
      ...(end.status === 'ambiguous' ? { boundaryOptionsUtc: end.optionsUtc } : {}),
    };
  }
  const elapsedSeconds = (Date.parse(end.instantUtc) - Date.parse(start.instantUtc)) / 1_000;
  if (elapsedSeconds <= 0 || !Number.isSafeInteger(elapsedSeconds)) {
    return { status: 'unresolved', reason: 'END_NOT_AFTER_START', wallMinutes };
  }
  return {
    status: 'resolved',
    timeZone,
    startInstantUtc: start.instantUtc,
    endInstantUtc: end.instantUtc,
    startInterpretation: start.interpretation,
    endInterpretation: end.interpretation,
    wallMinutes,
    elapsedSeconds,
    breakMinutesPlanned: validated.breakMinutes,
  };
}

export function elapsedLabel(seconds: number): string {
  if (!Number.isSafeInteger(seconds) || seconds < 0) throw new Error('INVALID_ELAPSED_SECONDS');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const extraSeconds = seconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m${extraSeconds ? ` ${extraSeconds}s` : ''}`;
}
