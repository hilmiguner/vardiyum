import { getDatabase } from './database';
import {
  routineMatchesDate,
  validateRecurrence,
  validateRoutine,
  type RoutineEvent,
  type RoutineRule,
} from '../domain/routine-engine';
import { calendarOrdinal, type ShiftSchedule } from '../domain/shift-engine';

interface RuleRow {
  id: string;
  title: string;
  recurrence_json: string;
  enabled: number;
  archived_at: string | null;
  revision: number;
}
interface CompletionRow {
  routine_id: string;
}
interface EventRow {
  id: string;
  routine_id: string;
  local_date: string;
  action: 'completed' | 'uncompleted';
  title_snapshot: string;
  recurrence_snapshot: string;
  occurred_at: string;
}
export interface RoutineSnapshot {
  rules: RoutineRule[];
  completedIds: Set<string>;
  events: RoutineEvent[];
}

function fromRow(row: RuleRow): RoutineRule {
  let recurrence: unknown;
  try {
    recurrence = JSON.parse(row.recurrence_json) as unknown;
  } catch {
    throw new Error('INVALID_STORED_RECURRENCE');
  }
  return validateRoutine({
    id: row.id,
    title: row.title,
    recurrence: validateRecurrence(recurrence),
    enabled: row.enabled === 1,
    archivedAt: row.archived_at,
    revision: row.revision,
  });
}

const eventFromRow = (r: EventRow): RoutineEvent => ({
  id: r.id,
  routineId: r.routine_id,
  localDate: r.local_date,
  action: r.action,
  titleSnapshot: r.title_snapshot,
  recurrenceSnapshot: r.recurrence_snapshot,
  occurredAt: r.occurred_at,
});

export async function loadRoutineSnapshot(date: string): Promise<RoutineSnapshot> {
  calendarOrdinal(date);
  const db = await getDatabase();
  const [rows, completions, events] = await Promise.all([
    db.getAllAsync<RuleRow>('SELECT * FROM routine_rules ORDER BY title, id'),
    db.getAllAsync<CompletionRow>(
      'SELECT routine_id FROM task_completions WHERE local_date = ?',
      date,
    ),
    db.getAllAsync<EventRow>(
      `SELECT * FROM routine_completion_events WHERE local_date = ?
       ORDER BY occurred_at DESC, id DESC`,
      date,
    ),
  ]);
  return {
    rules: rows.map(fromRow),
    completedIds: new Set(completions.map((item) => item.routine_id)),
    events: events.map(eventFromRow),
  };
}

/** Archiving, not DELETE: old completions and audit events stay intact. */
export async function archiveRoutine(id: string): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE routine_rules SET archived_at = CURRENT_TIMESTAMP, enabled = 0,
       revision = revision + 1 WHERE id = ? AND archived_at IS NULL`,
    id,
  );
  if (result.changes !== 1) throw new Error('ROUTINE_NOT_FOUND');
}

export async function restoreRoutine(id: string): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE routine_rules SET archived_at = NULL, enabled = 0,
       revision = revision + 1 WHERE id = ? AND archived_at IS NOT NULL`,
    id,
  );
  if (result.changes !== 1) throw new Error('ROUTINE_NOT_ARCHIVED');
}

export async function createRoutine(input: RoutineRule): Promise<void> {
  const rule = validateRoutine(input);
  if (rule.archivedAt !== null || rule.revision !== 1) throw new Error('INVALID_NEW_ROUTINE');
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO routine_rules(id,title,recurrence_json,enabled,revision) VALUES (?,?,?,?,1)',
    rule.id,
    rule.title,
    JSON.stringify(rule.recurrence),
    rule.enabled ? 1 : 0,
  );
}

export async function updateRoutine(input: RoutineRule): Promise<void> {
  const rule = validateRoutine(input);
  if (rule.archivedAt !== null) throw new Error('ROUTINE_ARCHIVED');
  const db = await getDatabase();
  // Optimistic revision guard prevents stale editor screens overwriting edits.
  const result = await db.runAsync(
    `UPDATE routine_rules SET title = ?, recurrence_json = ?, enabled = ?,
       revision = revision + 1
       WHERE id = ? AND revision = ? AND archived_at IS NULL`,
    rule.title,
    JSON.stringify(rule.recurrence),
    rule.enabled ? 1 : 0,
    rule.id,
    rule.revision,
  );
  if (result.changes !== 1) throw new Error('ROUTINE_MODIFIED_OR_ARCHIVED');
}

/**
 * One current checkbox per (routine,date), plus an append-only audit event
 * with the title/selector as they were at the moment of the action.
 */
export async function setRoutineCompletion(
  ruleId: string,
  localDate: string,
  completed: boolean,
  schedule: ShiftSchedule,
): Promise<void> {
  calendarOrdinal(localDate);
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<RuleRow>(
      'SELECT * FROM routine_rules WHERE id = ?',
      ruleId,
    );
    if (!row) throw new Error('ROUTINE_NOT_FOUND');
    const rule = fromRow(row);
    if (!routineMatchesDate(rule, localDate, schedule))
      throw new Error('ROUTINE_NOT_SCHEDULED');
    const previous = await tx.getFirstAsync<CompletionRow>(
      'SELECT routine_id FROM task_completions WHERE routine_id = ? AND local_date = ?',
      ruleId,
      localDate,
    );
    if (Boolean(previous) === completed) return;
    const now = new Date().toISOString();
    if (completed) {
      await tx.runAsync(
        `INSERT INTO task_completions(routine_id,local_date,completed_at)
         VALUES (?,?,?)`,
        ruleId,
        localDate,
        now,
      );
    } else {
      await tx.runAsync(
        'DELETE FROM task_completions WHERE routine_id = ? AND local_date = ?',
        ruleId,
        localDate,
      );
    }
    const eventId = `routine_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 13)}`;
    await tx.runAsync(
      `INSERT INTO routine_completion_events
       (id,routine_id,local_date,action,title_snapshot,recurrence_snapshot,occurred_at)
       VALUES (?,?,?,?,?,?,?)`,
      eventId,
      ruleId,
      localDate,
      completed ? 'completed' : 'uncompleted',
      rule.title,
      JSON.stringify(rule.recurrence),
      now,
    );
  });
}
