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
  MIGRATION_8_SQL,
  SCHEMA_VERSION,
} from '../src/data/schema.ts';

function migrateToV7() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
  ])
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}
const writeBase = (db) =>
  db.exec(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units)' +
      " VALUES('pay_1','2026-11-01','hourly','TRY',15000);",
  );
const insertRevision = (db, revision, rate = 20000, reason = 'Correction of entered rate') =>
  db
    .prepare(
      `INSERT INTO earnings_profile_revisions (
   profile_id,revision,effective_from,model,currency,base_minor_units,
   overtime_hourly_minor_units,overtime_after_minutes,
   overtime_multiplier_numerator,overtime_multiplier_denominator,
   reason,recorded_at
   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      'pay_1',
      revision,
      '2026-11-01',
      'hourly',
      'TRY',
      rate,
      0,
      null,
      1,
      1,
      reason,
      '2026-11-15T13:01:00.000Z',
    );

test('v7 -> v8 migrates without modifying old schedules, work, pay or break history', () => {
  const db = migrateToV7();
  try {
    db.exec(
      "INSERT INTO shift_patterns(id,anchor_date,timezone_id) VALUES('primary','2026-11-15','Europe/Istanbul');",
    );
    db.exec(
      "INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES('rule_1','Gym','{}',1);",
    );
    db.exec(
      "INSERT INTO actual_work_sessions(id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note) VALUES('work_1','2026-11-30','23:00','2026-12-01','07:00','Europe/Istanbul','reject','reject','2026-11-30T20:00:00.000Z','2026-12-01T04:00:00.000Z',30,'user');",
    );
    db.exec(
      "INSERT INTO earnings_month_break_allocations(work_id,start_period_key,start_month_break_minutes,original_break_minutes,original_start_utc,original_end_utc) VALUES('work_1','2026-11',10,30,'2026-11-30T20:00:00.000Z','2026-12-01T04:00:00.000Z');",
    );
    writeBase(db);
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_8_SQL + 'COMMIT;');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
    for (const table of [
      'shift_patterns',
      'routine_rules',
      'actual_work_sessions',
      'earnings_month_break_allocations',
      'earnings_profiles',
    ]) {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n, 1, table);
    }
    assert.equal(
      db.prepare('SELECT base_minor_units FROM earnings_profiles').get().base_minor_units,
      15000,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profile_revisions').get().n, 0);
  } finally {
    db.close();
  }
});

test('append-only v8 revision stores full snapshots without updating the original profile', () => {
  const db = migrateToV7();
  try {
    writeBase(db);
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_8_SQL + 'COMMIT;');
    insertRevision(db, 2);
    insertRevision(db, 3, 25000, 'Second corrected rate');
    const all = db
      .prepare(
        'SELECT revision,base_minor_units,reason,source FROM earnings_profile_revisions ORDER BY revision',
      )
      .all();
    assert.deepEqual(
      all.map((x) => [x.revision, x.base_minor_units, x.source]),
      [
        [2, 20000, 'user_entered'],
        [3, 25000, 'user_entered'],
      ],
    );
    assert.equal(
      db.prepare('SELECT base_minor_units FROM earnings_profiles').get().base_minor_units,
      15000,
    );
    assert.throws(
      () => db.exec('UPDATE earnings_profile_revisions SET base_minor_units=1'),
      /IMMUTABLE_PROFILE_REVISION/,
    );
    assert.throws(
      () => db.exec('DELETE FROM earnings_profile_revisions'),
      /IMMUTABLE_PROFILE_REVISION/,
    );
    assert.throws(() => insertRevision(db, 3), /UNIQUE constraint failed/);
  } finally {
    db.close();
  }
});

test('revision SQL constraints reject invalid source, bad pay, missing reason and orphan id', () => {
  const db = migrateToV7();
  try {
    writeBase(db);
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_8_SQL + 'COMMIT;');
    const base = `INSERT INTO earnings_profile_revisions (
      profile_id,revision,effective_from,model,currency,base_minor_units,
      overtime_hourly_minor_units,overtime_after_minutes,
      overtime_multiplier_numerator,overtime_multiplier_denominator,
      reason,recorded_at,source
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const insert = db.prepare(base);
    const args = (overrides = {}) => {
      const values = {
        profileId: 'pay_1',
        rev: 2,
        effective: '2026-11-01',
        model: 'hourly',
        currency: 'TRY',
        rate: 20000,
        otRate: 0,
        otAfter: null,
        num: 1,
        den: 1,
        reason: 'Correct this rate',
        recorded: '2026-11-15T13:01:00.000Z',
        source: 'user_entered',
        ...overrides,
      };
      return Object.values(values);
    };
    assert.throws(
      () => insert.run(...args({ profileId: 'unknown' })),
      /FOREIGN KEY constraint failed/,
    );
    assert.throws(() => insert.run(...args({ rev: 1 })), /CHECK constraint failed/);
    assert.throws(() => insert.run(...args({ rate: -50 })), /CHECK constraint failed/);
    assert.throws(() => insert.run(...args({ reason: 'x' })), /CHECK constraint failed/);
    assert.throws(
      () => insert.run(...args({ source: 'employer_verified' })),
      /CHECK constraint failed/,
    );
    assert.throws(() => insert.run(...args({ currency: 'JPY' })), /CHECK constraint failed/);
  } finally {
    db.close();
  }
});
