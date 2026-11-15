import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  SCHEMA_VERSION,
} from '../src/data/schema.ts';

function dbAtV3() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`BEGIN IMMEDIATE; ${INITIAL_SCHEMA} COMMIT;`);
  db.exec(`BEGIN IMMEDIATE; ${MIGRATION_2_SQL} COMMIT;`);
  db.exec(`BEGIN IMMEDIATE; ${MIGRATION_3_SQL} COMMIT;`);
  return db;
}
const selector = JSON.stringify({
  version: 1,
  shiftIds: [],
  weekdays: [],
  cycleDays: [],
  restOnly: false,
});

test('v1-v3 data and legacy routine completions survive migration to v4', () => {
  const db = dbAtV3();
  try {
    db.prepare(
      'INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES (?,?,?,1)',
    ).run('legacy_routine', 'Original title', selector);
    db.prepare(
      'INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES (?,?,?)',
    ).run('legacy_routine', '2026-11-15', '2026-11-15T09:30:00.000Z');
    db.exec(`
      INSERT INTO shift_patterns(id,anchor_date,timezone_id)
        VALUES('primary','2026-11-15','Europe/Istanbul');
      INSERT INTO pattern_days(pattern_id,day_index,shift_code)
        VALUES('primary',0,'morning');
      INSERT INTO day_overrides(date,shift_code,note)
        VALUES('2026-11-16','off','rest');
      INSERT INTO actual_work_sessions(
        id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,
        start_instant_utc,end_instant_utc,break_minutes,note
      ) VALUES('work_legacy','2026-11-15','08:00','2026-11-15','16:00','Europe/Istanbul',
        'reject','reject','2026-11-15T05:00:00.000Z','2026-11-15T13:00:00.000Z',30,'existing');
    `);
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_4_SQL} COMMIT;`);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pattern_days').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM day_overrides').get().n, 1);
    const event = db.prepare('SELECT * FROM routine_completion_events').get();
    assert.equal(event.title_snapshot, 'Original title');
    assert.equal(event.recurrence_snapshot, selector);
    assert.equal(event.occurred_at, '2026-11-15T09:30:00.000Z');
    assert.equal(event.action, 'completed');
    const migrated = db.prepare("SELECT * FROM routine_rules WHERE id='legacy_routine'").get();
    assert.equal(migrated.archived_at, null);
    assert.equal(migrated.revision, 1);
  } finally {
    db.close();
  }
});

test('archiving keeps old completed status and immutable audit snapshots', () => {
  const db = dbAtV3();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_4_SQL} COMMIT;`);
    db.prepare(
      'INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES (?,?,?,1)',
    ).run('task_a', 'First title', selector);
    db.prepare(
      'INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES (?,?,?)',
    ).run('task_a', '2026-11-15', '2026-11-15T09:00:00.000Z');
    db.prepare(
      `INSERT INTO routine_completion_events
      (id,routine_id,local_date,action,title_snapshot,recurrence_snapshot,occurred_at)
      VALUES (?,?,?,?,?,?,?)`,
    ).run(
      'evt_1',
      'task_a',
      '2026-11-15',
      'completed',
      'First title',
      selector,
      '2026-11-15T09:00:00.000Z',
    );
    db.prepare("UPDATE routine_rules SET title=?,revision=revision+1 WHERE id='task_a'").run(
      'New title',
    );
    db.prepare(
      `UPDATE routine_rules SET archived_at=CURRENT_TIMESTAMP,enabled=0 WHERE id='task_a'`,
    ).run();
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM routine_completion_events').get().n, 1);
    assert.equal(
      db.prepare("SELECT title_snapshot FROM routine_completion_events WHERE id='evt_1'").get()
        .title_snapshot,
      'First title',
    );
    assert.equal(
      db.prepare("SELECT title FROM routine_rules WHERE id='task_a'").get().title,
      'New title',
    );
    db.prepare(
      "DELETE FROM task_completions WHERE routine_id='task_a' AND local_date='2026-11-15'",
    ).run();
    db.prepare(
      `INSERT INTO routine_completion_events
      (id,routine_id,local_date,action,title_snapshot,recurrence_snapshot,occurred_at)
      VALUES (?,?,?,?,?,?,?)`,
    ).run(
      'evt_2',
      'task_a',
      '2026-11-15',
      'uncompleted',
      'New title',
      selector,
      '2026-11-15T10:00:00.000Z',
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM routine_completion_events').get().n, 2);
  } finally {
    db.close();
  }
});

test('two completion actions on different days are independently recorded', () => {
  const db = dbAtV3();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_4_SQL} COMMIT;`);
    db.prepare(
      'INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES (?,?,?,1)',
    ).run('routine_a', 'Daily', selector);
    for (const day of ['2026-11-15', '2026-11-16']) {
      db.prepare(
        'INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES (?,?,?)',
      ).run('routine_a', day, '2026-11-16T01:00:00.000Z');
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 2);
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES (?,?,?)',
          )
          .run('routine_a', '2026-11-15', '2026-11-16T03:00:00.000Z'),
      /UNIQUE constraint failed/,
    );
  } finally {
    db.close();
  }
});
