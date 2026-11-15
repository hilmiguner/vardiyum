import { getDatabase } from './database';
import { readPayPeriodStartDay, writePayPeriodStartDay } from '../domain/pay-period-settings';

/** Calendar-month reports remain unchanged until the custom-report issue is complete. */
export async function loadPayPeriodStartDay(): Promise<number> {
  return readPayPeriodStartDay(await getDatabase());
}

/** Saved in app_settings without changing SQLite v8 or its encrypted backup format. */
export async function savePayPeriodStartDay(startDay: number): Promise<void> {
  await writePayPeriodStartDay(await getDatabase(), startDay);
}
