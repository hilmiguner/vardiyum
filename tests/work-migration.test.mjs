import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, SCHEMA_VERSION,
} from '../src/data/schema.ts';

function originalV2() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`BEGIN IMMEDIATE; ${INITIAL_SCHEMA} COMMIT;`);
  db.exec(`BEGIN IMMEDIATE; ${MIGRATION_2_SQL} COMMIT;`);
  return db;
}

test('v1 to v2 to v3 is additive and preserves existing cycle and work row', () => {
  const db = originalV2();
  try {
    db.exec(`
      INSERT INTO shift_patterns(id, anchor_date, timezone_id)
        VALUES('primary', '2026-11-01', 'America/New_York');
      INSERT INTO pattern_days(pattern_id, day_index, shift_code)
        VALUES('primary', 0, 'night');
      INSERT INTO day_overrides(date, shift_code, note)
        VALUES('2026-11-02', 'off', 'planned rest');
      INSERT INTO work_entries(id, local_date, actual_start, actual_end, worked_minutes, kind)
        VALUES('legacy_1','2026-11-01','2026-11-01T04:00:00Z','2026-11-01T12:00:00Z',480,'regular');
    `);
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_3_SQL} COMMIT;`);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pattern_days').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM day_overrides').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM work_entries').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM shift_boundary_choices').get().n, 0);
    assert.equal(
      db.prepare("SELECT timezone_id FROM shift_patterns WHERE id='primary'").get().timezone_id,
      'America/New_York',
    );
  } finally { db.close(); }
});

test('one signed boundary choice per civil date with update and constraints', () => {
  const db = originalV2();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_3_SQL} COMMIT;`);
    db.prepare(`INSERT INTO shift_boundary_choices
      (local_date, schedule_signature, start_choice, end_choice) VALUES (?,?,?,?)`)
      .run('2026-11-01', 'sigA', 'earlier', 'reject');
    db.prepare(`INSERT INTO shift_boundary_choices
      (local_date, schedule_signature, start_choice, end_choice) VALUES (?,?,?,?)
      ON CONFLICT(local_date) DO UPDATE SET
        schedule_signature=excluded.schedule_signature,
        start_choice=excluded.start_choice,
        end_choice=excluded.end_choice`)
      .run('2026-11-01', 'sigB', 'later', 'reject');
    assert.deepEqual(
      {
        n: db.prepare('SELECT COUNT(*) AS n FROM shift_boundary_choices').get().n,
        choice: db.prepare(
          "SELECT start_choice FROM shift_boundary_choices WHERE local_date='2026-11-01'",
        ).get().start_choice,
      },
      { n: 1, choice: 'later' },
    );
    assert.throws(() => db.prepare(
      'INSERT INTO shift_boundary_choices VALUES (?,?,?,?,CURRENT_TIMESTAMP)',
    ).run('2026-11-02', 'sig', 'invalid', 'reject'), /CHECK constraint failed/);
  } finally { db.close(); }
});

test('actual session records immutable local provenance with UTC instants', () => {
  const db = originalV2();
  try {
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_3_SQL} COMMIT;`);
    db.prepare(`INSERT INTO actual_work_sessions
      (id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,
       start_instant_utc,end_instant_utc,break_minutes,note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run('work_1','2026-11-01','01:30','2026-11-01','02:30',
        'America/New_York','earlier','reject',
        '2026-11-01T05:30:00.000Z','2026-11-01T07:30:00.000Z',10,'manual');
    const row = db.prepare('SELECT * FROM actual_work_sessions WHERE id=?').get('work_1');
    assert.equal(row.source, 'user_entered');
    assert.equal(row.timezone_id, 'America/New_York');
    assert.equal(row.start_instant_utc, '2026-11-01T05:30:00.000Z');
    assert.equal(row.break_minutes, 10);
    const overlap = db.prepare(`SELECT COUNT(*) AS n FROM actual_work_sessions
      WHERE start_instant_utc < ? AND end_instant_utc > ?`)
      .get('2026-11-01T06:30:00.000Z','2026-11-01T06:00:00.000Z');
    assert.equal(overlap.n, 1);
    assert.throws(() => db.exec(`INSERT INTO actual_work_sessions
      (id,local_date,start_clock,end_date,end_clock,timezone_id,
       start_choice,end_choice,start_instant_utc,end_instant_utc)
      VALUES ('work_2','2026-11-01','03:00','2026-11-01','01:00','America/New_York',
       'reject','reject','2026-11-01T08:00:00.000Z','2026-11-01T07:00:00.000Z')`),
    /CHECK constraint failed/);
  } finally { db.close(); }
});
