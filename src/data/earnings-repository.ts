import { getDatabase } from './database';
import {
  estimateEarnings,
  periodBounds,
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
  const [profiles, work, adjustments] = await Promise.all([
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
      last, first,
    ),
    db.getAllAsync<AdjustmentRow>(
      'SELECT * FROM earnings_adjustments WHERE period_key = ? ORDER BY created_at,id',
      periodKey,
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
    work.map((row) => ({
      id: row.id, localDate: row.local_date, endDate: row.end_date,
      timeZone: row.timezone_id, startInstantUtc: row.start_instant_utc,
      endInstantUtc: row.end_instant_utc, breakMinutes: row.break_minutes,
      source: row.source as EarningsWork['source'],
    })),
    adjustments.map((row) => ({
      id: row.id, periodKey: row.period_key, kind: row.kind, currency: row.currency,
      amountMinorUnits: row.amount_minor_units, note: row.note,
      source: row.source as EarningsAdjustment['source'],
      createdAt: row.created_at,
    })),
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
