import { getDatabase } from './database';
import {
  appendRateBreakRevision,
  loadRateBreakCandidatesFromStore,
  type RateBreakCandidateResult,
  type RateBreakSave,
} from '../domain/rate-boundary-break-store';

export async function saveRateBoundaryBreakRevision(
  input: Omit<RateBreakSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendRateBreakRevision(tx, { ...input, recordedAt: new Date().toISOString() });
  });
}

/** Read from one SQLite snapshot; never write during candidate inspection. */
export async function loadRateBoundaryBreakCandidates(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<RateBreakCandidateResult> {
  const db = await getDatabase();
  const snapshot: { current: RateBreakCandidateResult | null } = { current: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    snapshot.current = await loadRateBreakCandidatesFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (snapshot.current === null) throw new Error('RATE_BREAK_CANDIDATE_READ_DID_NOT_FINISH');
  return snapshot.current;
}
