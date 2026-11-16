import { getDatabase } from './database';
import {
  appendFixedTransitionBaseRevision,
  loadFixedTransitionBaseReviewFromStore,
  type FixedTransitionBaseReview,
  type SaveFixedTransitionBase,
} from '../domain/custom-fixed-transition-store';

/** Explicit user declaration, atomically append-only. Not an earnings estimate. */
export async function saveFixedTransitionBaseChoice(
  input: Omit<SaveFixedTransitionBase, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendFixedTransitionBaseRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

export async function loadFixedTransitionBaseReview(
  periodKey: string,
  timeZone: string,
): Promise<FixedTransitionBaseReview> {
  const db = await getDatabase();
  const holder: { value: FixedTransitionBaseReview | null } = { value: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    holder.value = await loadFixedTransitionBaseReviewFromStore(tx, periodKey, timeZone);
  });
  if (holder.value === null) throw new Error('FIXED_TRANSITION_REVIEW_DID_NOT_FINISH');
  return holder.value;
}
