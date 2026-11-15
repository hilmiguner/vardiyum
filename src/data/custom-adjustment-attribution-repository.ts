import { getDatabase } from './database';
import {
  appendCustomAdjustmentAttribution,
  loadCustomAdjustmentReportFromStore,
  type CustomAdjustmentReport,
  type CustomAdjustmentSave,
} from '../domain/custom-adjustment-attribution-store';

/** A source-level decision shared by BOTH neighboring custom pay periods. */
export async function saveCustomAdjustmentSplit(
  input: Omit<CustomAdjustmentSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async tx => {
    await appendCustomAdjustmentAttribution(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

/** Original adjustment sources and every historical revision use one snapshot. */
export async function loadCustomAdjustmentReport(
  periodKey: string,
): Promise<CustomAdjustmentReport> {
  const db = await getDatabase();
  const result: { current: CustomAdjustmentReport | null } = { current: null };
  await db.withExclusiveTransactionAsync(async tx => {
    result.current = await loadCustomAdjustmentReportFromStore(tx, periodKey);
  });
  if (result.current === null) throw new Error('CUSTOM_ADJUSTMENT_READ_NOT_COMPLETED');
  return result.current;
}
