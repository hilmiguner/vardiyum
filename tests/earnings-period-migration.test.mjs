import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  MIGRATION_5_SQL,
  MIGRATION_6_SQL,
  MIGRATION_7_SQL,
} from '../src/data/schema.ts';

function dbV6() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
  ])
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}

test('SQLite v1–v6 business data is unchanged and empty v7 allocation tables are added', () => {
  const db = dbV6();
  try {
    db.exec(
      "INSERT INTO shift_patterns(id,anchor_date,timezone_id) VALUES('primary','2026-11-15','Europe/Istanbul');",
    );
    db.exec(
      "INSERT INTO pattern_days(pattern_id,day_index,shift_code) VALUES('primary',0,'night');",
    );
    db.exec(
      "INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units) VALUES('p1','2026-11-01','hourly','TRY',15000);",
    );
    db.exec(
      "INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,note,created_at) VALUES('adj','2026-11','bonus','TRY',500,'old','2026-11-15T10:00:00.000Z');",
    );
    db.exec(
      "INSERT INTO actual_work_sessions(id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note) VALUES('work_1','2026-11-30','23:00','2026-12-01','07:00','Europe/Istanbul','reject','reject','2026-11-30T20:00:00.000Z','2026-12-01T04:00:00.000Z',30,'self-reported');",
    );
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_7_SQL + 'COMMIT;');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 7);
    for (const table of [
      'shift_patterns',
      'pattern_days',
      'earnings_profiles',
      'earnings_adjustments',
      'actual_work_sessions',
    ]) {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n, 1, table);
    }
    assert.equal(
      db.prepare("SELECT source FROM actual_work_sessions WHERE id='work_1'").get().source,
      'user_entered',
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n,
      0,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocation_events').get().n,
      0,
    );
  } finally {
    db.close();
  }
});

test('explicit break allocation update preserves previous revision events', () => {
  const db = dbV6();
  try {
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_7_SQL + 'COMMIT;');
    const insert = db.prepare(
      `INSERT INTO earnings_month_break_allocations (
       work_id,start_period_key,start_month_break_minutes,original_break_minutes,
       original_start_utc,original_end_utc,revision)
       VALUES (?,?,?,?,?,?,?)`,
    );
    insert.run(
      'work_a',
      '2026-11',
      10,
      30,
      '2026-11-30T20:00:00.000Z',
      '2026-12-01T04:00:00.000Z',
      1,
    );
    const event = db.prepare(
      `INSERT INTO earnings_month_break_allocation_events (
      id,work_id,revision,start_period_key,start_month_break_minutes,
      original_break_minutes,original_start_utc,original_end_utc,recorded_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
    );
    event.run(
      'evt_a',
      'work_a',
      1,
      '2026-11',
      10,
      30,
      '2026-11-30T20:00:00.000Z',
      '2026-12-01T04:00:00.000Z',
      '2026-11-15T00:00:00.000Z',
    );
    db.prepare(
      "UPDATE earnings_month_break_allocations SET start_month_break_minutes=12,revision=2 WHERE work_id='work_a'",
    ).run();
    event.run(
      'evt_b',
      'work_a',
      2,
      '2026-11',
      12,
      30,
      '2026-11-30T20:00:00.000Z',
      '2026-12-01T04:00:00.000Z',
      '2026-11-15T01:00:00.000Z',
    );
    assert.equal(
      db.prepare('SELECT start_month_break_minutes FROM earnings_month_break_allocations').get()
        .start_month_break_minutes,
      12,
    );
    const history = db
      .prepare(
        'SELECT revision,start_month_break_minutes FROM earnings_month_break_allocation_events ORDER BY revision',
      )
      .all();
    assert.deepEqual(
      history.map((x) => [x.revision, x.start_month_break_minutes]),
      [
        [1, 10],
        [2, 12],
      ],
    );
    assert.throws(
      () =>
        event.run(
          'evt_c',
          'work_a',
          2,
          '2026-11',
          15,
          30,
          '2026-11-30T20:00:00.000Z',
          '2026-12-01T04:00:00.000Z',
          '2026-11-15T02:00:00.000Z',
        ),
      /UNIQUE constraint failed/,
    );
  } finally {
    db.close();
  }
});

test('SQL checks reject negative break, excess allocation and invalid source', () => {
  const db = dbV6();
  try {
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_7_SQL + 'COMMIT;');
    const insert = db.prepare(
      `INSERT INTO earnings_month_break_allocations
       (work_id,start_period_key,start_month_break_minutes,original_break_minutes,
        original_start_utc,original_end_utc,source)
       VALUES (?,?,?,?,?,?,?)`,
    );
    for (const [id, allocated, total, source] of [
      ['a', -1, 30, 'user_entered'],
      ['b', 31, 30, 'user_entered'],
      ['c', 10, 30, 'employer_verified'],
    ]) {
      assert.throws(
        () =>
          insert.run(
            id,
            '2026-11',
            allocated,
            total,
            '2026-11-30T20:00:00.000Z',
            '2026-12-01T04:00:00.000Z',
            source,
          ),
        /CHECK constraint failed/,
      );
    }
  } finally {
    db.close();
  }
});
