import { getDatabase } from './database';
import {
  appendTwoFixedOvertimePolicyRevision,
  loadTwoFixedOvertimePolicyReviewFromStore,
  type SaveTwoFixedOvertimePolicy,
  type TwoFixedOvertimePolicyReview,
} from '../domain/two-fixed-overtime-store';

export async function saveTwoFixedOvertimePolicy(
  input: Omit<SaveTwoFixedOvertimePolicy, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendTwoFixedOvertimePolicyRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

export async function loadTwoFixedOvertimePolicyReview(
  periodKey: string,
  timeZone: string,
): Promise<TwoFixedOvertimePolicyReview> {
  const db = await getDatabase();
  const holder: { value: TwoFixedOvertimePolicyReview | null } = { value: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    holder.value = await loadTwoFixedOvertimePolicyReviewFromStore(tx, periodKey, timeZone);
  });
  if (!holder.value) throw new Error('TWO_FIXED_OT_READ_DID_NOT_FINISH');
  return holder.value;
}
