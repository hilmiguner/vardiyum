import { getDatabase } from './database';
import {
  prepareActualWork,
  prepareBoundaryChoice,
  type ActualWorkDraft,
  type ActualWorkSession,
  type StoredBoundaryChoice,
} from '../domain/work-records';
import type { ShiftTemplate } from '../domain/shift-engine';
import type { BoundaryPolicy, FoldChoice } from '../domain/zoned-shift-time';

interface ChoiceRow {
  local_date: string;
  schedule_signature: string;
  start_choice: FoldChoice;
  end_choice: FoldChoice;
}

interface WorkRow {
  id: string;
  local_date: string;
  start_clock: string;
  end_date: string;
  end_clock: string;
  timezone_id: string;
  start_choice: FoldChoice;
  end_choice: FoldChoice;
  start_instant_utc: string;
  end_instant_utc: string;
  break_minutes: number;
  note: string;
}

export async function loadBoundaryChoices(): Promise<Record<string, StoredBoundaryChoice>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ChoiceRow>(
    'SELECT local_date, schedule_signature, start_choice, end_choice FROM shift_boundary_choices',
  );
  const choices: Record<string, StoredBoundaryChoice> = {};
  for (const row of rows) {
    choices[row.local_date] = {
      localDate: row.local_date,
      signature: row.schedule_signature,
      startChoice: row.start_choice,
      endChoice: row.end_choice,
    };
  }
  return choices;
}

export async function storeBoundaryChoice(
  date: string,
  template: ShiftTemplate,
  timeZone: string,
  policy: Readonly<BoundaryPolicy> | null,
): Promise<StoredBoundaryChoice | null> {
  const db = await getDatabase();
  if (policy === null) {
    await db.runAsync('DELETE FROM shift_boundary_choices WHERE local_date = ?', date);
    return null;
  }
  const choice = prepareBoundaryChoice(date, template, timeZone, policy);
  await db.runAsync(
    `INSERT INTO shift_boundary_choices
     (local_date, schedule_signature, start_choice, end_choice)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(local_date) DO UPDATE SET
       schedule_signature = excluded.schedule_signature,
       start_choice = excluded.start_choice,
       end_choice = excluded.end_choice,
       updated_at = CURRENT_TIMESTAMP`,
    choice.localDate,
    choice.signature,
    choice.startChoice,
    choice.endChoice,
  );
  return choice;
}

function decodeWork(row: WorkRow): ActualWorkSession {
  const elapsedSeconds =
    (Date.parse(row.end_instant_utc) - Date.parse(row.start_instant_utc)) / 1000;
  const netLoggedSeconds = elapsedSeconds - row.break_minutes * 60;
  if (
    !Number.isSafeInteger(elapsedSeconds) ||
    !Number.isSafeInteger(netLoggedSeconds) ||
    netLoggedSeconds <= 0
  ) throw new Error('CORRUPT_ACTUAL_WORK_SESSION');
  return {
    id: row.id,
    localDate: row.local_date,
    startClock: row.start_clock,
    endDate: row.end_date,
    endClock: row.end_clock,
    timeZone: row.timezone_id,
    startChoice: row.start_choice,
    endChoice: row.end_choice,
    breakMinutes: row.break_minutes,
    note: row.note,
    startInstantUtc: row.start_instant_utc,
    endInstantUtc: row.end_instant_utc,
    elapsedSeconds,
    netLoggedSeconds,
  };
}

export async function loadActualWork(localDate: string): Promise<ActualWorkSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkRow>(
    `SELECT * FROM actual_work_sessions WHERE local_date = ?
     ORDER BY start_instant_utc, id`,
    localDate,
  );
  return rows.map(decodeWork);
}

/**
 * Each session is self-reported. Prevents overlapping UTC intervals so later
 * analytics cannot accidentally double-count the same instant.
 */
export async function storeActualWork(draft: ActualWorkDraft): Promise<ActualWorkSession> {
  const result = prepareActualWork(draft);
  if (result.status !== 'valid') throw new Error(result.reason);
  const session = result.session;
  const id = `work_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const overlap = await tx.getFirstAsync<{ id: string }>(
      `SELECT id FROM actual_work_sessions
       WHERE start_instant_utc < ? AND end_instant_utc > ? LIMIT 1`,
      session.endInstantUtc,
      session.startInstantUtc,
    );
    if (overlap) throw new Error('ACTUAL_WORK_OVERLAP');
    await tx.runAsync(
      `INSERT INTO actual_work_sessions (
        id, local_date, start_clock, end_date, end_clock, timezone_id,
        start_choice, end_choice, start_instant_utc, end_instant_utc,
        break_minutes, note, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user_entered')`,
      id,
      session.localDate,
      session.startClock,
      session.endDate,
      session.endClock,
      session.timeZone,
      session.startChoice,
      session.endChoice,
      session.startInstantUtc,
      session.endInstantUtc,
      session.breakMinutes,
      session.note,
    );
  });
  return { id, ...session };
}

export async function removeActualWork(id: string): Promise<void> {
  if (!/^work_[a-z0-9_]+$/.test(id)) throw new Error('INVALID_WORK_SESSION_ID');
  const db = await getDatabase();
  await db.runAsync('DELETE FROM actual_work_sessions WHERE id = ?', id);
}
