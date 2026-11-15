import { getDatabase } from './database';
import {
  appendFixedOvertimeRevision,
  loadFixedOvertimeViewFromStore,
  type FixedOvertimeSave,
  type FixedOvertimeView,
} from '../domain/custom-fixed-overtime-store';

/** User decision and its source-linked revision written in one SQLite transaction. */
export async function saveFixedOvertimeDecision(
  input: Omit<FixedOvertimeSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendFixedOvertimeRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

/** A coherent snapshot across latest profile/base/consent/actual work/break audit. */
export async function loadFixedOvertimeView(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<FixedOvertimeView> {
  const db = await getDatabase();
  const holder: { value: FixedOvertimeView | null } = { value: null };
  await db.withExclusiveTransactionAsync(async (tx) => {
    holder.value = await loadFixedOvertimeViewFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (holder.value === null) throw new Error('FIXED_OVERTIME_REPORT_READ_NOT_COMPLETED');
  return holder.value;
}
