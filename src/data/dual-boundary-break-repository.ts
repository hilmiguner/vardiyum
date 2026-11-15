import { getDatabase } from './database';
import {
  appendDualBoundaryBreakRevision,
  loadDualBoundaryCandidatesFromStore,
  type DualBreakSave,
  type DualBoundaryCandidateResult,
} from '../domain/dual-boundary-break-store';

export async function saveDualBoundaryBreakRevision(
  input: Omit<DualBreakSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendDualBoundaryBreakRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

/** Snapshot-consistent discovery and history; never updates original work. */
export async function loadDualBoundaryBreakCandidates(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<DualBoundaryCandidateResult> {
  const db = await getDatabase();
  const holder: { value: DualBoundaryCandidateResult | null } = { value: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    holder.value = await loadDualBoundaryCandidatesFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (holder.value === null) throw new Error('DUAL_BREAK_READ_DID_NOT_FINISH');
  return holder.value;
}
