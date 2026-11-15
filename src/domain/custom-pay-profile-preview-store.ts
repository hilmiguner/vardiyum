import type { EarningsProfile } from './earnings-engine.ts';
import {
  resolvePayProfileRevisions,
  type PayProfileRevision,
} from './earnings-profile-revisions.ts';
import { planCustomPayProfiles, type CustomPayProfilePlan } from './custom-pay-profile-policy.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

/** Read-only adapter for Expo SQLite and node:sqlite regression tests. */
export interface PayProfilePreviewStore {
  getFirstAsync<T>(sql: string, ...params: string[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: string[]): Promise<T[]>;
}

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
  source: string;
}

interface RevisionRow extends Omit<ProfileRow, 'id'> {
  profile_id: string;
  reason: string;
  recorded_at: string;
}

function toProfile(row: ProfileRow): EarningsProfile {
  if (row.source !== 'user_entered') throw new Error('UNVERIFIED_PAY_PROFILE_SOURCE');
  return {
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
  };
}

function toRevision(row: RevisionRow): PayProfileRevision {
  return {
    profile: toProfile({ ...row, id: row.profile_id }),
    reason: row.reason,
    recordedAt: row.recorded_at,
    source: row.source as PayProfileRevision['source'],
  };
}

/**
 * Never writes or alters existing monthly earnings/adjustments. Resolves the
 * complete immutable revision chain first; a missing/orphan/duplicate version
 * is rejected even if the latest row alone looked plausible.
 */
export async function loadCustomPayProfilePreviewFromStore(
  store: PayProfilePreviewStore,
  periodKey: string,
  timeZone: string,
): Promise<CustomPayProfilePlan> {
  const startDay = await readPayPeriodStartDay(store);
  const [base, changes] = await Promise.all([
    store.getAllAsync<ProfileRow>(
      'SELECT id,effective_from,model,currency,base_minor_units,' +
        'overtime_hourly_minor_units,overtime_after_minutes,' +
        'overtime_multiplier_numerator,overtime_multiplier_denominator,revision,source ' +
        'FROM earnings_profiles ORDER BY effective_from,id',
    ),
    store.getAllAsync<RevisionRow>(
      'SELECT profile_id,effective_from,model,currency,base_minor_units,' +
        'overtime_hourly_minor_units,overtime_after_minutes,' +
        'overtime_multiplier_numerator,overtime_multiplier_denominator,revision,' +
        'reason,recorded_at,source ' +
        'FROM earnings_profile_revisions ORDER BY effective_from,profile_id,revision',
    ),
  ]);
  const profiles = resolvePayProfileRevisions(base.map(toProfile), changes.map(toRevision));
  // The displayed preference may change while the source is being read.
  if ((await readPayPeriodStartDay(store)) !== startDay)
    throw new Error('PAY_PROFILE_PREVIEW_SETTING_CHANGED');
  return planCustomPayProfiles(periodKey, startDay, timeZone, profiles);
}
