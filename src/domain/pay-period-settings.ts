/**
 * A persisted user preference for a FUTURE, explicitly enabled custom-pay
 * report. Current earnings reports still use calendar months unconditionally.
 *
 * app_settings is part of the existing SQLite v8 18-table encrypted snapshot:
 * no schema migration or legacy-backup transformation is necessary.
 */
export const PAY_PERIOD_START_DAY_KEY = 'earnings_pay_period_start_day_v1';

export interface PayPeriodSettingsStore {
  getFirstAsync<T>(sql: string, ...params: string[]): Promise<T | null>;
  runAsync(sql: string, ...params: string[]): Promise<unknown>;
}

export function validatePayPeriodStartDay(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 28)
    throw new Error('INVALID_PAY_PERIOD_START_DAY');
  return value as number;
}

/** The absence of a setting means the original, uninterrupted calendar month. */
export function decodePayPeriodStartDay(row: { value: string } | null): number {
  if (row === null) return 1;
  // Deliberately canonical: no whitespace, leading zeros, JSON, or partial parse.
  if (typeof row.value !== 'string' || !/^(?:[1-9]|1[0-9]|2[0-8])$/.test(row.value))
    throw new Error('INVALID_STORED_PAY_PERIOD_START_DAY');
  return validatePayPeriodStartDay(Number(row.value));
}

export async function readPayPeriodStartDay(store: PayPeriodSettingsStore): Promise<number> {
  const row = await store.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    PAY_PERIOD_START_DAY_KEY,
  );
  return decodePayPeriodStartDay(row);
}

/**
 * Store only the explicit user choice; an invalid value is refused before SQL.
 * The UPSERT is a single SQLite statement, with no other financial records
 * changed. Existing v8 encrypted exports automatically include this key.
 */
export async function writePayPeriodStartDay(
  store: PayPeriodSettingsStore,
  startDay: number,
): Promise<void> {
  const validated = validatePayPeriodStartDay(startDay);
  await store.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    PAY_PERIOD_START_DAY_KEY,
    String(validated),
  );
}
