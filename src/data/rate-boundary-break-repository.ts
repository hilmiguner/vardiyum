import { getDatabase } from './database';
import {
  appendRateBreakRevision,
  loadRateBreakCandidatesFromStore,
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
) {
  const db = await getDatabase();
  let result: Awaited<ReturnType<typeof loadRateBreakCandidatesFromStore>> | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await loadRateBreakCandidatesFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (!result) throw new Error('RATE_BREAK_CANDIDATE_READ_DID_NOT_FINISH');
  return result;
}
