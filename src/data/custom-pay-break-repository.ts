import { getDatabase } from './database';
import {
  customBreakEventKey,
  customBreakHeadKey,
  customBreakPrefix,
  customBreakSourcePeriods,
  createCustomBreakEvent,
  decodeCustomBreakHistory,
  type CustomPayBreakEvent,
  type CustomPayBreakRow,
} from '../domain/custom-pay-break-audit';
import { validateEarningsWork, type EarningsWork } from '../domain/earnings-engine';
import { customPayPeriodBounds, payPeriodForDate } from '../domain/pay-period';
import { readPayPeriodStartDay } from '../domain/pay-period-settings';
import { calendarDateInZone } from '../domain/shift-engine';

type SqlParameter = string | number;

export interface CustomBreakSqlStore {
  getFirstAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T[]>;
  runAsync(sql: string, ...params: SqlParameter[]): Promise<{ changes: number }>;
}

interface WorkRow {
  id: string;
  local_date: string;
  end_date: string;
  timezone_id: string;
  start_instant_utc: string;
  end_instant_utc: string;
  break_minutes: number;
  source: string;
}

function toWork(raw: WorkRow): EarningsWork {
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

const WORK_SQL =
  'SELECT id,local_date,end_date,timezone_id,start_instant_utc,' +
  'end_instant_utc,break_minutes,source FROM actual_work_sessions';

/**
 * Uses substr instead of LIKE because user work IDs can contain underscores:
 * LIKE would treat an underscore as a wildcard and mix different audit streams.
 */
export async function readCustomPayBreakHistory(
  store: CustomBreakSqlStore,
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

export interface CustomPayBreakSave {
  workId: string;
  startDay: number;
  startPeriodBreakMinutes: number;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

/**
 * Must execute exclusively; on any error, the outer SQLite transaction must
 * roll back BOTH the new event key and the updated revision head key.
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

  // The setting is read INSIDE the caller's exclusive transaction.
  const configuredDay = await readPayPeriodStartDay(store);
  if (configuredDay !== input.startDay) throw new Error('CUSTOM_BREAK_SETTING_CHANGED');
  const raw = await store.getFirstAsync<WorkRow>(WORK_SQL + ' WHERE id = ?', input.workId);
  if (!raw) throw new Error('CUSTOM_BREAK_WORK_NOT_FOUND');
  const work = validateEarningsWork(toWork(raw));
  const history = await readCustomPayBreakHistory(store, work, input.startDay);
  if (history.length !== input.expectedRevision)
    throw new Error('STALE_CUSTOM_BREAK_REVISION');
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
  if (history.length === 0) {
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

/** Binds a single append-only correction to a transaction (no partial writes). */
export async function saveCustomPayBreakRevision(
  input: Omit<CustomPayBreakSave, 'recordedAt'>,
): Promise<CustomPayBreakEvent> {
  const db = await getDatabase();
  let result: CustomPayBreakEvent | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await appendCustomPayBreakRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
  if (!result) throw new Error('CUSTOM_BREAK_COMMIT_FAILED');
  return result;
}

export interface CustomPayBreakCandidate {
  workId: string;
  startDay: number;
  startPeriodKey: string;
  originalBreakMinutes: number;
  startInstantUtc: string;
  endInstantUtc: string;
  timeZone: string;
  chosenStartMinutes: number | null;
  revision: number;
  recordedAt: string | null;
}

export interface CustomPayBreakCandidateResult {
  startDay: number;
  candidates: CustomPayBreakCandidate[];
}

/**
 * Preparation-only UI source. Existing monthly earnings reports are unchanged.
 * History is revalidated against the current original work before display.
 */
export async function loadCustomPayBreakCandidates(
  periodKey: string,
): Promise<CustomPayBreakCandidateResult> {
  const db = await getDatabase();
  const startDay = await readPayPeriodStartDay(db);
  if (startDay === 1) return { startDay, candidates: [] };
  const bounds = customPayPeriodBounds(periodKey, startDay);
  const rows = await db.getAllAsync<WorkRow>(
    WORK_SQL + ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
    bounds.endDateInclusive,
    bounds.startDate,
  );
  const candidates: CustomPayBreakCandidate[] = [];
  for (const raw of rows) {
    const work = validateEarningsWork(toWork(raw));
    const firstDate = calendarDateInZone(work.timeZone, new Date(work.startInstantUtc));
    const lastDate = calendarDateInZone(
      work.timeZone,
      new Date(Date.parse(work.endInstantUtc) - 1),
    );
    const first = payPeriodForDate(firstDate, startDay);
    const last = payPeriodForDate(lastDate, startDay);
    if (first === last || !work.breakMinutes || (periodKey !== first && periodKey !== last))
      continue;
    customBreakSourcePeriods(work, startDay);
    const history = await readCustomPayBreakHistory(db, work, startDay);
    const latest = history[history.length - 1];
    candidates.push({
      workId: work.id,
      startDay,
      startPeriodKey: first,
      originalBreakMinutes: work.breakMinutes,
      startInstantUtc: work.startInstantUtc,
      endInstantUtc: work.endInstantUtc,
      timeZone: work.timeZone,
      chosenStartMinutes: latest?.startPeriodBreakMinutes ?? null,
      revision: latest?.revision ?? 0,
      recordedAt: latest?.recordedAt ?? null,
    });
  }
  return { startDay, candidates };
}
