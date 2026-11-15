import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  MIGRATION_5_SQL,
  SCHEMA_VERSION,
} from '../src/data/schema.ts';

function fromV4() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON;');
  for (const sql of [INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL])
    db.exec(`BEGIN IMMEDIATE; ${sql} COMMIT;`);
  return db;
}
test('v4 legacy routine and completions survive v5 without requesting permission', () => {
  const db = fromV4();
  try {
    const r = JSON.stringify({
      version: 1,
      shiftIds: [],
      weekdays: [],
      cycleDays: [],
      restOnly: false,
    });
    db.prepare(
      'INSERT INTO routine_rules (id,title,recurrence_json,enabled) VALUES (?,?,?,1)',
    ).run('legacy', 'Old title', r);
    db.prepare(
      'INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES (?,?,?)',
    ).run('legacy', '2026-11-15', '2026-11-15T06:00:00Z');
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_5_SQL} COMMIT;`);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
    const row = db.prepare("SELECT * FROM routine_rules WHERE id='legacy'").get();
    assert.equal(row.title, 'Old title');
    assert.equal(row.reminder_clock, null);
    assert.equal(row.reminder_timezone_id, null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 1);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM app_settings WHERE key='routine_reminders_opted_in'",
        )
        .get().n,
      0,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM routine_completion_events').get().n, 0);
  } finally {
    db.close();
  }
});
test('valid reminder values are persisted and invalid hours are blocked by SQL check', () => {
  const db = fromV4();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_5_SQL} COMMIT;`);
    db.prepare(
      'INSERT INTO routine_rules(id,title,recurrence_json,enabled,reminder_clock,reminder_timezone_id) VALUES(?,?,?,1,?,?)',
    ).run(
      'r1',
      'Workout',
      '{"version":1,"shiftIds":[],"weekdays":[],"cycleDays":[],"restOnly":false}',
      '09:30',
      'Europe/Istanbul',
    );
    const row = db
      .prepare("SELECT reminder_clock,reminder_timezone_id FROM routine_rules WHERE id='r1'")
      .get();
    assert.equal(row.reminder_clock, '09:30');
    assert.equal(row.reminder_timezone_id, 'Europe/Istanbul');
    assert.throws(
      () => db.prepare("UPDATE routine_rules SET reminder_clock=? WHERE id='r1'").run('24:30'),
      /CHECK constraint failed/,
    );
    db.prepare('INSERT INTO app_settings(key,value) VALUES (?,?)').run(
      'routine_reminders_opted_in',
      '1',
    );
    assert.equal(
      db.prepare("SELECT value FROM app_settings WHERE key='routine_reminders_opted_in'").get()
        .value,
      '1',
    );
  } finally {
    db.close();
  }
});
test('schedule time zone update keeps legacy history and atomically revises configured reminders', () => {
  const db = fromV4();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_5_SQL} COMMIT;`);
    const json = '{"version":1,"shiftIds":[],"weekdays":[],"cycleDays":[],"restOnly":false}';
    db.exec(
      "INSERT INTO shift_patterns(id,anchor_date,timezone_id) VALUES('primary','2026-11-15','Europe/Istanbul')",
    );
    db.prepare(
      'INSERT INTO routine_rules(id,title,recurrence_json,enabled,reminder_clock,reminder_timezone_id) VALUES(?,?,?,1,?,?)',
    ).run('r1', 'Daily', json, '10:00', 'Europe/Istanbul');
    db.exec(`BEGIN IMMEDIATE;
      UPDATE shift_patterns SET timezone_id='America/New_York' WHERE id='primary';
      UPDATE routine_rules SET reminder_timezone_id='America/New_York',revision=revision+1
      WHERE reminder_clock IS NOT NULL AND archived_at IS NULL;
      COMMIT;`);
    const r = db
      .prepare("SELECT revision,reminder_timezone_id FROM routine_rules WHERE id='r1'")
      .get();
    assert.equal(r.revision, 2);
    assert.equal(r.reminder_timezone_id, 'America/New_York');
    assert.equal(
      db.prepare("SELECT timezone_id FROM shift_patterns WHERE id='primary'").get().timezone_id,
      'America/New_York',
    );
  } finally {
    db.close();
  }
});
