import { getDatabase } from './database';
import {
  loadCustomPayCombinedFromStore,
} from '../domain/custom-pay-combined-store';
import type { CustomPayCombinedEstimate } from '../domain/custom-pay-combined';

/** One exclusive read-only snapshot; never updates original monthly sources. */
export async function loadCustomPayCombinedEstimate(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomPayCombinedEstimate> {
  const db = await getDatabase();
  const holder: { result: CustomPayCombinedEstimate | null } = { result: null };
  await db.withExclusiveTransactionAsync(async tx => {
    holder.result = await loadCustomPayCombinedFromStore(
      tx, periodKey, scheduleTimeZone,
    );
  });
  if (holder.result === null)
    throw new Error('CUSTOM_COMBINED_TRANSACTION_DID_NOT_FINISH');
  return holder.result;
}
