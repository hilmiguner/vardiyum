import { getDatabase } from './database';
import { completionKey } from '../domain/routine-reminders';
import {
  addCalendarDays,
  calendarDateInZone,
  type ShiftSchedule,
} from '../domain/shift-engine';
import { loadRoutineSnapshot } from './routine-repository';

const SETTING = 'routine_reminders_opted_in';
interface CompletionRow {
  routine_id: string;
  local_date: string;
}

export async function getReminderOptIn(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    SETTING,
  );
  return row?.value === '1';
}

export async function setReminderOptIn(enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_settings(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTING,
    enabled ? '1' : '0',
  );
}

export async function loadReminderData(
  schedule: ShiftSchedule,
  now: Date,
  horizonDays: number,
): Promise<{
  rules: Awaited<ReturnType<typeof loadRoutineSnapshot>>['rules'];
  completedKeys: Set<string>;
}> {
  if (!schedule.pattern) return { rules: [], completedKeys: new Set() };
  const start = calendarDateInZone(schedule.timeZone, now);
  const end = addCalendarDays(start, horizonDays - 1);
  const db = await getDatabase();
  const [snapshot, completed] = await Promise.all([
    loadRoutineSnapshot(start),
    db.getAllAsync<CompletionRow>(
      `SELECT routine_id,local_date FROM task_completions
       WHERE local_date BETWEEN ? AND ?`,
      start,
      end,
    ),
  ]);
  return {
    rules: snapshot.rules,
    completedKeys: new Set(
      completed.map((row) => completionKey(row.routine_id, row.local_date)),
    ),
  };
}
