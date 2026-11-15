import {
  customBreakEventKey,
  customBreakHeadKey,
  customBreakPrefix,
  createCustomBreakEvent,
  decodeCustomBreakHistory,
  type CustomPayBreakEvent,
  type CustomPayBreakRow,
} from './custom-pay-break-audit.ts';
import { validateEarningsWork, type EarningsWork } from './earnings-engine.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';

type SqlParameter = string | number;

/** Testable adapter: caller must provide an exclusive SQLite transaction. */
export interface CustomBreakSqlStore {
  getFirstAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T[]>;
  runAsync(sql: string, ...params: SqlParameter[]): Promise<{ changes: number }>;
}

export interface CustomPayBreakSave {
  workId: string;
  startDay: number;
  startPeriodBreakMinutes: number;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

export interface CustomBreakWorkRow {
  id: string;
  local_date: string;
  end_date: string;
  timezone_id: string;
  start_instant_utc: string;
  end_instant_utc: string;
  break_minutes: number;
  source: string;
}

export function workFromCustomBreakRow(raw: CustomBreakWorkRow): EarningsWork {
  return {
    id: raw.id,
    localDate: raw.local_date,
    endDate: raw.end_date,
    timeZone: raw.timezone_id,
    startInstantUtc: raw.start_instant_utc,
    endInstantUtc: raw.end_instant_utc,
    breakMinutes: raw.break_minutes,
    source: raw.source as EarningsWork['source'],
  };
}

export const CUSTOM_BREAK_WORK_SQL =
  'SELECT id,local_date,end_date,timezone_id,start_instant_utc,' +
  'end_instant_utc,break_minutes,source FROM actual_work_sessions';

/** Underscore in an ID is literal: LIKE would match unrelated stream IDs. */
export async function readCustomPayBreakHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  work: EarningsWork,
  startDay: number,
): Promise<CustomPayBreakEvent[]> {
  const prefix = customBreakPrefix(work.id, startDay);
  const rows = await store.getAllAsync<CustomPayBreakRow>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?) = ? ORDER BY key',
    prefix.length,
    prefix,
  );
  return decodeCustomBreakHistory(work, startDay, rows);
}

/**
 * Must be called inside an EXCLUSIVE SQLite transaction. Every accepted
 * correction adds a new event key, then advances the head key in the same
 * transaction, with readback of all prior events before returning.
 *
 * No DELETE or UPDATE of an existing event is performed by this API. This is
 * app-level append-only history, NOT tamper-proof storage against an actor
 * editing SQLite directly.
 */
export async function appendCustomPayBreakRevision(
  store: CustomBreakSqlStore,
  input: CustomPayBreakSave,
): Promise<CustomPayBreakEvent> {
  customBreakPrefix(input.workId, input.startDay);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.expectedRevision > 64
  )
    throw new Error('INVALID_CUSTOM_BREAK_EXPECTED_REVISION');

  // Read the current setting and source work INSIDE the exclusive transaction.
  if ((await readPayPeriodStartDay(store)) !== input.startDay)
    throw new Error('CUSTOM_BREAK_SETTING_CHANGED');
  const raw = await store.getFirstAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL + ' WHERE id = ?',
    input.workId,
  );
  if (!raw) throw new Error('CUSTOM_BREAK_WORK_NOT_FOUND');
  const work = validateEarningsWork(workFromCustomBreakRow(raw));
  const history = await readCustomPayBreakHistory(store, work, input.startDay);
  if (history.length !== input.expectedRevision) throw new Error('STALE_CUSTOM_BREAK_REVISION');
  if (
    history.length &&
    history[history.length - 1].startPeriodBreakMinutes === input.startPeriodBreakMinutes
  )
    throw new Error('UNCHANGED_CUSTOM_BREAK_ALLOCATION');
  if (history.length && input.recordedAt < history[history.length - 1].recordedAt)
    throw new Error('INVALID_CUSTOM_BREAK_REVISION');

  const event = createCustomBreakEvent(
    work,
    input.startDay,
    input.startPeriodBreakMinutes,
    history.length + 1,
    input.reason,
    input.recordedAt,
  );
  await store.runAsync(
    'INSERT INTO app_settings (key,value) VALUES (?,?)',
    customBreakEventKey(work.id, input.startDay, event.revision),
    JSON.stringify(event),
  );
  const key = customBreakHeadKey(work.id, input.startDay);
  if (!history.length) {
    await store.runAsync('INSERT INTO app_settings (key,value) VALUES (?,?)', key, '1');
  } else {
    const result = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision),
      key,
      String(history.length),
    );
    if (result.changes !== 1) throw new Error('STALE_CUSTOM_BREAK_REVISION');
  }

  const readback = await readCustomPayBreakHistory(store, work, input.startDay);
  if (
    readback.length !== event.revision ||
    JSON.stringify(readback[readback.length - 1]) !== JSON.stringify(event)
  )
    throw new Error('CUSTOM_BREAK_READBACK_MISMATCH');
  return event;
}
