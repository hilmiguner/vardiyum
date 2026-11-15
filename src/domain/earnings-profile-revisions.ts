import {
  validateEarningsProfile,
  type EarningsProfile,
} from './earnings-engine.ts';

/**
 * Version 1 remains the original earnings_profiles row. Versions 2+ are
 * immutable complete snapshots, never partial overlays or SQL UPDATEs.
 */
export interface PayProfileRevision {
  profile: EarningsProfile;
  reason: string;
  recordedAt: string;
  source: 'user_entered';
}

const ISO_UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

export function validateProfileRevision(value: PayProfileRevision): PayProfileRevision {
  const profile = validateEarningsProfile(value.profile);
  if (profile.revision < 2) throw new Error('REVISION_MUST_EXCEED_BASE');
  if (value.source !== 'user_entered') throw new Error('UNVERIFIED_PROFILE_REVISION');
  if (typeof value.reason !== 'string' || value.reason.trim().length < 3 ||
      value.reason.trim().length > 160)
    throw new Error('PROFILE_REVISION_REASON_REQUIRED');
  const time = Date.parse(value.recordedAt);
  if (typeof value.recordedAt !== 'string' || !ISO_UTC.test(value.recordedAt) ||
      !Number.isFinite(time) || new Date(time).toISOString() !== value.recordedAt)
    throw new Error('INVALID_PROFILE_REVISION_TIMESTAMP');
  return { profile, reason: value.reason.trim(), recordedAt: value.recordedAt,
    source: 'user_entered' };
}

export function profileVersionHistory(
  base: EarningsProfile,
  revisions: readonly PayProfileRevision[],
): readonly EarningsProfile[] {
  const original = validateEarningsProfile(base);
  if (original.revision !== 1) throw new Error('INVALID_BASE_PROFILE_REVISION');
  const sorted = revisions.map(validateProfileRevision)
    .sort((a,b) => a.profile.revision - b.profile.revision);
  const history: EarningsProfile[] = [original];
  let previousStamp = '';
  for (const row of sorted) {
    if (row.profile.id !== original.id ||
        row.profile.effectiveFrom !== original.effectiveFrom)
      throw new Error('PROFILE_IDENTITY_CHANGED');
    if (row.profile.revision !== history.length + 1)
      throw new Error('MISSING_OR_DUPLICATE_PROFILE_REVISION');
    if (row.recordedAt < previousStamp)
      throw new Error('NONMONOTONIC_PROFILE_REVISION_TIMESTAMP');
    history.push(row.profile);
    previousStamp = row.recordedAt;
  }
  return history;
}

export function resolvePayProfileRevisions(
  originals: readonly EarningsProfile[],
  revisions: readonly PayProfileRevision[],
): EarningsProfile[] {
  const ids = new Set(originals.map(x=>x.id));
  for (const row of revisions) {
    if (!ids.has(row.profile.id)) throw new Error('ORPHAN_PAY_PROFILE_REVISION');
  }
  const dates = new Set<string>();
  return originals.map((original) => {
    if (dates.has(original.effectiveFrom)) throw new Error('DUPLICATE_EFFECTIVE_MONTH');
    dates.add(original.effectiveFrom);
    const history = profileVersionHistory(
      original,
      revisions.filter(x=>x.profile.id === original.id),
    );
    return history[history.length - 1];
  });
}

export function prepareNextProfileRevision(
  current: EarningsProfile,
  changes: Omit<EarningsProfile, 'id' | 'effectiveFrom' | 'revision'>,
  reason: string,
  recordedAt: string,
): PayProfileRevision {
  if (current.revision >= 1_000_000) throw new Error('PROFILE_REVISION_LIMIT');
  return validateProfileRevision({
    profile: {
      ...changes,
      id: current.id,
      effectiveFrom: current.effectiveFrom,
      revision: current.revision + 1,
    },
    reason,
    recordedAt,
    source: 'user_entered',
  });
}
