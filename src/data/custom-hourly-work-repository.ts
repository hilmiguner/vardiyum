import { getDatabase } from './database';
import { loadCustomHourlyEstimateFromStore } from '../domain/custom-hourly-work-store';
import type { CustomHourlyEstimate } from '../domain/custom-hourly-work-estimate';

/** All custom-period pay reads share one exclusive, consistent SQLite snapshot. */
export async function loadCustomHourlyEstimate(
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomHourlyEstimate> {
  const db = await getDatabase();
  let report: CustomHourlyEstimate | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    report = await loadCustomHourlyEstimateFromStore(tx, periodKey, scheduleTimeZone);
  });
  if (report === null) throw new Error('CUSTOM_PAY_READ_DID_NOT_FINISH');
  return report;
}
