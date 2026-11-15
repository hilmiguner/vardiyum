import { getDatabase } from './database';
import {
  appendCustomFixedBaseRevision,
  loadCustomFixedBaseReportFromStore,
  type CustomFixedBaseReport,
  type CustomFixedBaseSave,
} from '../domain/custom-fixed-base-store';

/** Atomic append-only user decision; never changes the legacy monthly report. */
export async function saveCustomFixedBaseChoice(
  input: Omit<CustomFixedBaseSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendCustomFixedBaseRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

/** All plan, profile and historical choice reads share the same SQLite snapshot. */
export async function loadCustomFixedBaseReport(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomFixedBaseReport> {
  const db = await getDatabase();
  const holder: { value: CustomFixedBaseReport | null } = { value: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    holder.value = await loadCustomFixedBaseReportFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (holder.value === null) throw new Error('CUSTOM_FIXED_BASE_READ_DID_NOT_FINISH');
  return holder.value;
}
