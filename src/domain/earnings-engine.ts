import { addCalendarDays, calendarOrdinal } from './shift-engine.ts';
import {
  splitWorkForMonth,
  type MonthBreakAllocation,
  type WorkPeriodPortion,
} from './earnings-period.ts';

export type EarningsModel = 'hourly' | 'monthly_fixed';
export type AdjustmentKind = 'bonus' | 'deduction' | 'correction';

export interface EarningsProfile {
  id: string;
  effectiveFrom: string; // first day of a calendar month
  model: EarningsModel;
  currency: string; // ISO-4217-like three uppercase letters, no FX conversions
  /** Hourly rate for hourly; full calendar month base for monthly_fixed. */
  baseMinorUnits: number;
  /** Monthly base is NEVER prorated or reduced by missing logged hours. */
  overtimeHourlyMinorUnits: number;
  /** Explicit period-wide threshold. null = overtime not estimated. */
  overtimeAfterMinutes: number | null;
  overtimeMultiplierNumerator: number;
  overtimeMultiplierDenominator: number;
  revision: number; // immutable version: new effective month = new record
}

export interface EarningsWork {
  id: string;
  localDate: string; // scheduled start civil date, not phone date
  endDate: string;
  timeZone: string;
  startInstantUtc: string;
  endInstantUtc: string;
  breakMinutes: number;
  source: 'user_entered';
}

export interface EarningsAdjustment {
  id: string;
  periodKey: string; // YYYY-MM
  kind: AdjustmentKind;
  amountMinorUnits: number; // signed: deductions negative, corrections either
  currency: string;
  note: string;
  source: 'user_entered';
  createdAt: string;
}

export type EarningsLineKind =
  | 'monthly_base'
  | 'hourly_regular'
  | 'hourly_overtime'
  | 'monthly_overtime'
  | 'logged_work'
  | 'adjustment';

export interface EarningsLine {
  kind: EarningsLineKind;
  sourceId: string;
  profileId: string;
  profileRevision: number;
  seconds: number;
  amountMinorUnits: number;
  description: string;
  segmentStartUtc?: string;
  segmentEndUtc?: string;
}

export type EarningsReport =
  | { status: 'needs_profile'; periodKey: string }
  | { status: 'blocked'; periodKey: string; reasons: string[] }
  | {
      status: 'estimated';
      periodKey: string;
      profile: EarningsProfile;
      totalMinorUnits: number;
      loggedSeconds: number;
      regularSeconds: number;
      overtimeSeconds: number;
      lines: EarningsLine[];
      splitAcrossMonthsCount: number;
      /** There is no tax, social security, employer approval or net-pay engine. */
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    };

const KEY = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const ZULU = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;
const MAX_MONEY = 1_000_000_000_000; // 10 billion major currency units

function money(value: unknown, allowNegative: boolean): number {
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(value as number) > MAX_MONEY ||
    (!allowNegative && (value as number) < 0)
  )
    throw new Error('INVALID_MONEY_AMOUNT');
  return value as number;
}

function natural(value: unknown, min: number, max: number, error: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max)
    throw new Error(error);
  return value as number;
}

export function periodBounds(key: string): { first: string; last: string } {
  if (!KEY.test(key)) throw new Error('INVALID_EARNINGS_PERIOD');
  const first = key + '-01';
  calendarOrdinal(first);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  if (nextYear > 9999) throw new Error('INVALID_EARNINGS_PERIOD');
  const next =
    String(nextYear).padStart(4, '0') + '-' + String(nextMonth).padStart(2, '0') + '-01';
  return { first, last: addCalendarDays(next, -1) };
}

export function validateEarningsProfile(profile: EarningsProfile): EarningsProfile {
  if (!IDENTIFIER.test(profile.id)) throw new Error('INVALID_EARNINGS_PROFILE_ID');
  calendarOrdinal(profile.effectiveFrom);
  if (!profile.effectiveFrom.endsWith('-01'))
    throw new Error('PROFILE_MUST_START_FIRST_OF_MONTH');
  if (profile.model !== 'hourly' && profile.model !== 'monthly_fixed')
    throw new Error('INVALID_EARNINGS_MODEL');
  if (!/^(TRY|USD|EUR|GBP)$/.test(profile.currency)) throw new Error('INVALID_CURRENCY');
  money(profile.baseMinorUnits, false);
  money(profile.overtimeHourlyMinorUnits, false);
  if (profile.baseMinorUnits <= 0) throw new Error('INVALID_BASE_RATE');
  if (profile.overtimeAfterMinutes !== null) {
    natural(profile.overtimeAfterMinutes, 0, 31 * 24 * 60, 'INVALID_OVERTIME_THRESHOLD');
    if (profile.model === 'monthly_fixed' && profile.overtimeHourlyMinorUnits <= 0)
      throw new Error('OVERTIME_HOURLY_RATE_REQUIRED');
  }
  natural(profile.overtimeMultiplierNumerator, 1, 1000, 'INVALID_MULTIPLIER');
  natural(profile.overtimeMultiplierDenominator, 1, 1000, 'INVALID_MULTIPLIER');
  if (profile.overtimeMultiplierNumerator < profile.overtimeMultiplierDenominator)
    throw new Error('INVALID_MULTIPLIER');
  natural(profile.revision, 1, 1000000, 'INVALID_PROFILE_REVISION');
  return { ...profile };
}

export function validateAdjustment(row: EarningsAdjustment): EarningsAdjustment {
  if (!IDENTIFIER.test(row.id)) throw new Error('INVALID_ADJUSTMENT_ID');
  periodBounds(row.periodKey);
  if (!['bonus', 'deduction', 'correction'].includes(row.kind))
    throw new Error('INVALID_ADJUSTMENT_KIND');
  money(row.amountMinorUnits, true);
  if (row.amountMinorUnits === 0) throw new Error('ZERO_ADJUSTMENT');
  if (row.kind === 'bonus' && row.amountMinorUnits <= 0)
    throw new Error('BONUS_MUST_BE_POSITIVE');
  if (row.kind === 'deduction' && row.amountMinorUnits >= 0)
    throw new Error('DEDUCTION_MUST_BE_NEGATIVE');
  if (!/^(TRY|USD|EUR|GBP)$/.test(row.currency)) throw new Error('INVALID_CURRENCY');
  const note = row.note.trim();
  if (!note || note.length > 160) throw new Error('INVALID_ADJUSTMENT_NOTE');
  if (row.source !== 'user_entered') throw new Error('UNVERIFIED_ADJUSTMENT_SOURCE');
  const stamp = Date.parse(row.createdAt);
  if (
    !ZULU.test(row.createdAt) ||
    !Number.isFinite(stamp) ||
    new Date(stamp).toISOString() !== row.createdAt
  )
    throw new Error('INVALID_ADJUSTMENT_TIMESTAMP');
  return { ...row, note };
}

function utcStamp(value: string): number {
  if (!ZULU.test(value)) throw new Error('INVALID_WORK_TIMESTAMP');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value)
    throw new Error('INVALID_WORK_TIMESTAMP');
  return ms;
}

/** No inferred DST fold, no planned-vs-actual conversion, no trusted payslip. */
export function validateEarningsWork(
  work: EarningsWork,
): EarningsWork & { netSeconds: number } {
  if (!IDENTIFIER.test(work.id)) throw new Error('INVALID_WORK_ID');
  calendarOrdinal(work.localDate);
  calendarOrdinal(work.endDate);
  if (
    work.endDate < work.localDate ||
    calendarOrdinal(work.endDate) - calendarOrdinal(work.localDate) > 3
  )
    throw new Error('INVALID_WORK_CIVIL_DATES');
  if (work.source !== 'user_entered') throw new Error('UNVERIFIED_WORK_SOURCE');
  if (typeof work.timeZone !== 'string' || !work.timeZone)
    throw new Error('INVALID_WORK_TIMEZONE');
  const start = utcStamp(work.startInstantUtc);
  const end = utcStamp(work.endInstantUtc);
  const secs = (end - start) / 1000;
  if (!Number.isSafeInteger(secs) || secs <= 0 || secs > 72 * 3600)
    throw new Error('INVALID_WORK_INTERVAL');
  natural(work.breakMinutes, 0, 72 * 60, 'INVALID_WORK_BREAK');
  const netSeconds = secs - work.breakMinutes * 60;
  if (netSeconds <= 0) throw new Error('INVALID_WORK_BREAK');
  return { ...work, netSeconds };
}

function asNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
    throw new Error('MONEY_OVERFLOW');
  return Number(value);
}

/** Half-away-from-zero rounding, without any binary-floating currency math. */
export function roundRational(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) throw new Error('INVALID_DIVISOR');
  const sign = numerator < 0n ? -1n : 1n;
  const magnitude = numerator < 0n ? -numerator : numerator;
  return asNumber(sign * ((magnitude + denominator / 2n) / denominator));
}

export function estimateEarnings(
  periodKey: string,
  profiles: readonly EarningsProfile[],
  workRows: readonly EarningsWork[],
  adjustmentRows: readonly EarningsAdjustment[],
  breakAllocations: readonly MonthBreakAllocation[] = [],
): EarningsReport {
  const { first } = periodBounds(periodKey);
  const allProfiles = profiles.map(validateEarningsProfile);
  const active = allProfiles
    .filter((item) => item.effectiveFrom <= first)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  if (!active.length) return { status: 'needs_profile', periodKey };
  if (active.length > 1 && active[0].effectiveFrom === active[1].effectiveFrom)
    throw new Error('AMBIGUOUS_PROFILE_EFFECTIVE_DATE');
  const profile = active[0];
  const reasons: string[] = [];
  const sessions: WorkPeriodPortion[] = [];
  const breaks = new Map<string, MonthBreakAllocation>();
  for (const allocation of breakAllocations) {
    if (breaks.has(allocation.workId)) throw new Error('DUPLICATE_BREAK_ALLOCATION');
    breaks.set(allocation.workId, allocation);
  }
  const ids = new Set<string>();

  for (const work of workRows) {
    try {
      const session = validateEarningsWork(work);
      if (ids.has(session.id)) throw new Error('DUPLICATE_WORK_RECORD');
      ids.add(session.id);
      // Split on saved IANA civil-month midnight using original UTC instants.
      // Zero-break crossings split automatically; nonzero breaks require an
      // explicit, source-bound allocation in BOTH monthly reports.
      const portion = splitWorkForMonth(session, periodKey, breaks.get(session.id));
      if (portion) sessions.push(portion);
    } catch (error) {
      reasons.push((error instanceof Error ? error.message : 'INVALID_WORK') + ':' + work.id);
    }
  }
  sessions.sort(
    (a, b) =>
      a.startInstantUtc.localeCompare(b.startInstantUtc) || a.workId.localeCompare(b.workId),
  );
  let latestEnd = sessions[0]?.endInstantUtc ?? '';
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].startInstantUtc < latestEnd)
      reasons.push('OVERLAPPING_WORK_SESSIONS:' + sessions[i].workId);
    if (sessions[i].endInstantUtc > latestEnd) latestEnd = sessions[i].endInstantUtc;
  }
  const adjustments: EarningsAdjustment[] = [];
  for (const row of adjustmentRows) {
    try {
      const checked = validateAdjustment(row);
      if (checked.periodKey !== periodKey) throw new Error('ADJUSTMENT_OTHER_PERIOD');
      if (checked.currency !== profile.currency)
        throw new Error('ADJUSTMENT_CURRENCY_MISMATCH');
      adjustments.push(checked);
    } catch (error) {
      reasons.push(
        (error instanceof Error ? error.message : 'INVALID_ADJUSTMENT') + ':' + row.id,
      );
    }
  }
  if (reasons.length) return { status: 'blocked', periodKey, reasons };
  const lines: EarningsLine[] = [];
  const addLine = (
    kind: EarningsLineKind,
    sourceId: string,
    secs: number,
    amount: number,
    description: string,
  ) => {
    lines.push({
      kind,
      sourceId,
      seconds: secs,
      amountMinorUnits: amount,
      profileId: profile.id,
      profileRevision: profile.revision,
      description,
      ...(sessions.find((row) => row.workId === sourceId)
        ? {
            segmentStartUtc: sessions.find((row) => row.workId === sourceId)!.startInstantUtc,
            segmentEndUtc: sessions.find((row) => row.workId === sourceId)!.endInstantUtc,
          }
        : {}),
    });
  };
  if (profile.model === 'monthly_fixed') {
    addLine(
      'monthly_base',
      profile.id,
      0,
      profile.baseMinorUnits,
      'Full calendar-month base only; not prorated for missing sessions',
    );
  }
  let totalLogged = 0;
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  const threshold =
    profile.overtimeAfterMinutes === null ? null : profile.overtimeAfterMinutes * 60;
  for (const row of sessions) {
    const priorSeconds = totalLogged;
    totalLogged += row.netSeconds;
    const regular =
      threshold === null
        ? row.netSeconds
        : Math.max(0, Math.min(row.netSeconds, threshold - priorSeconds));
    const overtime = row.netSeconds - regular;
    regularSeconds += regular;
    overtimeSeconds += overtime;
    if (profile.model === 'hourly') {
      if (regular)
        addLine(
          'hourly_regular',
          row.workId,
          regular,
          roundRational(BigInt(profile.baseMinorUnits) * BigInt(regular), 3600n),
          'User-reported working seconds at explicit hourly rate',
        );
      if (overtime)
        addLine(
          'hourly_overtime',
          row.workId,
          overtime,
          roundRational(
            BigInt(profile.baseMinorUnits) *
              BigInt(overtime) *
              BigInt(profile.overtimeMultiplierNumerator),
            3600n * BigInt(profile.overtimeMultiplierDenominator),
          ),
          'User-chosen period threshold and overtime multiplier',
        );
    } else {
      addLine(
        'logged_work',
        row.workId,
        row.netSeconds,
        0,
        'Informational self-reported hours only; monthly base not prorated',
      );
      if (overtime)
        addLine(
          'monthly_overtime',
          row.workId,
          overtime,
          roundRational(
            BigInt(profile.overtimeHourlyMinorUnits) *
              BigInt(overtime) *
              BigInt(profile.overtimeMultiplierNumerator),
            3600n * BigInt(profile.overtimeMultiplierDenominator),
          ),
          'Additional overtime above user-chosen monthly threshold',
        );
    }
  }
  for (const row of adjustments.sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )) {
    addLine('adjustment', row.id, 0, row.amountMinorUnits, row.kind + ': ' + row.note);
  }
  const total = lines.reduce((sum, item) => sum + BigInt(item.amountMinorUnits), 0n);
  return {
    status: 'estimated',
    periodKey,
    profile,
    totalMinorUnits: asNumber(total),
    splitAcrossMonthsCount: sessions.filter((row) => row.splitAcrossMonths).length,
    loggedSeconds: totalLogged,
    regularSeconds,
    overtimeSeconds,
    lines,
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}
