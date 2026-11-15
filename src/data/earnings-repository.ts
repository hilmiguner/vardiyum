import { getDatabase } from './database';
import { calendarDateInZone } from '../domain/shift-engine';
import { splitWorkForMonth, type MonthBreakAllocation } from '../domain/earnings-period';
import {
  estimateEarnings,
  periodBounds,
  validateEarningsWork,
  validateAdjustment,
  validateEarningsProfile,
  type EarningsAdjustment,
  type EarningsProfile,
  type EarningsReport,
  type EarningsWork,
} from '../domain/earnings-engine';

interface ProfileRow {
  id: string;
  effective_from: string;
  model: EarningsProfile['model'];
  currency: string;
  base_minor_units: number;
  overtime_hourly_minor_units: number;
  overtime_after_minutes: number | null;
  overtime_multiplier_numerator: number;
  overtime_multiplier_denominator: number;
  revision: number;
}

interface WorkRow {
  id: string;
  local_date: string;
  end_date: string;
  timezone_id: string;
  start_instant_utc: string;
  end_instant_utc: string;
  break_minutes: number;
  source: string;
}
interface BreakRow {
  work_id: string;
  start_period_key: string;
  start_month_break_minutes: number;
  original_break_minutes: number;
  original_start_utc: string;
  original_end_utc: string;
  source: 'user_entered';
}

function toBreak(row: BreakRow): MonthBreakAllocation {
  return {
    workId: row.work_id,
    startPeriodKey: row.start_period_key,
    startMonthBreakMinutes: row.start_month_break_minutes,
    originalBreakMinutes: row.original_break_minutes,
    originalStartUtc: row.original_start_utc,
    originalEndUtc: row.original_end_utc,
    source: row.source,
  };
}

function toWork(row: WorkRow): EarningsWork {
  return {
    id: row.id,
    localDate: row.local_date,
    endDate: row.end_date,
    timeZone: row.timezone_id,
    startInstantUtc: row.start_instant_utc,
    endInstantUtc: row.end_instant_utc,
    breakMinutes: row.break_minutes,
    source: row.source as EarningsWork['source'],
  };
}

interface AdjustmentRow {
  id: string;
  period_key: string;
  kind: EarningsAdjustment['kind'];
  currency: string;
  amount_minor_units: number;
  note: string;
  source: string;
  created_at: string;
}

export async function loadEarningsReport(periodKey: string): Promise<EarningsReport> {
  const { first, last } = periodBounds(periodKey);
  const db = await getDatabase();
  const [profiles, work, adjustments, allocations] = await Promise.all([
    db.getAllAsync<ProfileRow>(
      'SELECT * FROM earnings_profiles WHERE effective_from <= ? ORDER BY effective_from DESC',
      first,
    ),
    // Also inspect sessions starting BEFORE the period and ending inside it.
    // No silent attribution of month-crossing shifts or missed overlaps.
    db.getAllAsync<WorkRow>(
      `SELECT id,local_date,end_date,timezone_id,start_instant_utc,end_instant_utc,
              break_minutes,source
       FROM actual_work_sessions
       WHERE local_date <= ? AND end_date >= ?
       ORDER BY start_instant_utc,id`,
      last,
      first,
    ),
    db.getAllAsync<AdjustmentRow>(
      'SELECT * FROM earnings_adjustments WHERE period_key = ? ORDER BY created_at,id',
      periodKey,
    ),
    db.getAllAsync<BreakRow>(
      `SELECT * FROM earnings_month_break_allocations
       WHERE work_id IN (
         SELECT id FROM actual_work_sessions
         WHERE local_date <= ? AND end_date >= ?
       )`,
      last,
      first,
    ),
  ]);
  return estimateEarnings(
    periodKey,
    profiles.map((row) => ({
      id: row.id,
      effectiveFrom: row.effective_from,
      model: row.model,
      currency: row.currency,
      baseMinorUnits: row.base_minor_units,
      overtimeHourlyMinorUnits: row.overtime_hourly_minor_units,
      overtimeAfterMinutes: row.overtime_after_minutes,
      overtimeMultiplierNumerator: row.overtime_multiplier_numerator,
      overtimeMultiplierDenominator: row.overtime_multiplier_denominator,
      revision: row.revision,
    })),
    work.map(toWork),
    adjustments.map((row) => ({
      id: row.id,
      periodKey: row.period_key,
      kind: row.kind,
      currency: row.currency,
      amountMinorUnits: row.amount_minor_units,
      note: row.note,
      source: row.source as EarningsAdjustment['source'],
      createdAt: row.created_at,
    })),
    allocations.map(toBreak),
  );
}

export async function saveEarningsProfile(input: EarningsProfile): Promise<void> {
  const profile = validateEarningsProfile(input);
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO earnings_profiles (
      id,effective_from,model,currency,base_minor_units,
      overtime_hourly_minor_units,overtime_after_minutes,
      overtime_multiplier_numerator,overtime_multiplier_denominator,revision,source
    ) VALUES (?,?,?,?,?,?,?,?,?,?,'user_entered')`,
    profile.id,
    profile.effectiveFrom,
    profile.model,
    profile.currency,
    profile.baseMinorUnits,
    profile.overtimeHourlyMinorUnits,
    profile.overtimeAfterMinutes,
    profile.overtimeMultiplierNumerator,
    profile.overtimeMultiplierDenominator,
    profile.revision,
  );
}

/** Append-only manual adjustments. Reverse errors using a new correction. */
export async function addEarningsAdjustment(input: EarningsAdjustment): Promise<void> {
  const adjustment = validateAdjustment(input);
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO earnings_adjustments (
      id,period_key,kind,currency,amount_minor_units,note,source,created_at
    ) VALUES (?,?,?,?,?,?,'user_entered',?)`,
    adjustment.id,
    adjustment.periodKey,
    adjustment.kind,
    adjustment.currency,
    adjustment.amountMinorUnits,
    adjustment.note,
    adjustment.createdAt,
  );
}

/** The raw source session is never altered; an explicit choice is versioned. */
export interface BreakAllocationCandidate {
  workId: string;
  startPeriodKey: string;
  originalBreakMinutes: number;
  startInstantUtc: string;
  endInstantUtc: string;
  timeZone: string;
  chosenStartMinutes: number | null;
}

export async function loadBreakAllocationCandidates(
  periodKey: string,
): Promise<BreakAllocationCandidate[]> {
  const { first, last } = periodBounds(periodKey);
  const db = await getDatabase();
  const [work, allocations] = await Promise.all([
    db.getAllAsync<WorkRow>(
      `SELECT id,local_date,end_date,timezone_id,start_instant_utc,
       end_instant_utc,break_minutes,source FROM actual_work_sessions
       WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id`,
      last,
      first,
    ),
    db.getAllAsync<BreakRow>('SELECT * FROM earnings_month_break_allocations'),
  ]);
  const byId = new Map(allocations.map((r) => [r.work_id, toBreak(r)]));
  const result: BreakAllocationCandidate[] = [];
  for (const row of work) {
    const original = validateEarningsWork(toWork(row));
    const firstMonth = calendarDateInZone(
      original.timeZone,
      new Date(original.startInstantUtc),
    ).slice(0, 7);
    const lastMonth = calendarDateInZone(
      original.timeZone,
      new Date(Date.parse(original.endInstantUtc) - 1),
    ).slice(0, 7);
    if (firstMonth === lastMonth || !original.breakMinutes) continue;
    const allocation = byId.get(original.id);
    result.push({
      workId: original.id,
      startPeriodKey: firstMonth,
      originalBreakMinutes: original.breakMinutes,
      startInstantUtc: original.startInstantUtc,
      endInstantUtc: original.endInstantUtc,
      timeZone: original.timeZone,
      chosenStartMinutes: allocation?.startMonthBreakMinutes ?? null,
    });
  }
  return result;
}

/**
 * A user-provided START-month break allocation, with append-only revision log.
 * The remainder belongs to the next month. Both pieces are independently
 * validated against actual elapsed seconds before any database write.
 */
export async function saveBreakAllocation(
  workId: string,
  startMonthBreakMinutes: number,
): Promise<void> {
  if (!Number.isSafeInteger(startMonthBreakMinutes) || startMonthBreakMinutes < 0)
    throw new Error('INVALID_BREAK_ALLOCATION');
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const raw = await tx.getFirstAsync<WorkRow>(
      `SELECT id,local_date,end_date,timezone_id,start_instant_utc,
       end_instant_utc,break_minutes,source FROM actual_work_sessions WHERE id = ?`,
      workId,
    );
    if (!raw) throw new Error('WORK_NOT_FOUND');
    const work = validateEarningsWork(toWork(raw));
    const startMonth = calendarDateInZone(work.timeZone, new Date(work.startInstantUtc)).slice(
      0,
      7,
    );
    const endMonth = calendarDateInZone(
      work.timeZone,
      new Date(Date.parse(work.endInstantUtc) - 1),
    ).slice(0, 7);
    if (startMonth === endMonth || work.breakMinutes === 0)
      throw new Error('WORK_NOT_CROSS_MONTH_BREAK');
    const allocation: MonthBreakAllocation = {
      workId,
      startPeriodKey: startMonth,
      startMonthBreakMinutes,
      originalBreakMinutes: work.breakMinutes,
      originalStartUtc: work.startInstantUtc,
      originalEndUtc: work.endInstantUtc,
      source: 'user_entered',
    };
    // Prove both sides are nonnegative, even when editing from only one month.
    splitWorkForMonth(work, startMonth, allocation);
    splitWorkForMonth(work, endMonth, allocation);
    const old = await tx.getFirstAsync<{ revision: number }>(
      'SELECT revision FROM earnings_month_break_allocations WHERE work_id = ?',
      workId,
    );
    const revision = (old?.revision ?? 0) + 1;
    await tx.runAsync(
      `INSERT INTO earnings_month_break_allocations (
       work_id,start_period_key,start_month_break_minutes,original_break_minutes,
       original_start_utc,original_end_utc,revision
       ) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(work_id) DO UPDATE SET
       start_period_key=excluded.start_period_key,
       start_month_break_minutes=excluded.start_month_break_minutes,
       original_break_minutes=excluded.original_break_minutes,
       original_start_utc=excluded.original_start_utc,
       original_end_utc=excluded.original_end_utc,
       revision=excluded.revision,updated_at=CURRENT_TIMESTAMP`,
      workId,
      startMonth,
      startMonthBreakMinutes,
      work.breakMinutes,
      work.startInstantUtc,
      work.endInstantUtc,
      revision,
    );
    const eventId =
      'break_evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
    await tx.runAsync(
      `INSERT INTO earnings_month_break_allocation_events(
       id,work_id,revision,start_period_key,start_month_break_minutes,
       original_break_minutes,original_start_utc,original_end_utc,recorded_at
       ) VALUES (?,?,?,?,?,?,?,?,?)`,
      eventId,
      workId,
      revision,
      startMonth,
      startMonthBreakMinutes,
      work.breakMinutes,
      work.startInstantUtc,
      work.endInstantUtc,
      new Date().toISOString(),
    );
  });
}
