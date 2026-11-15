import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { INITIAL_SCHEMA, MIGRATION_2_SQL } from '../src/data/schema.ts';

function freshV1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`BEGIN IMMEDIATE; ${INITIAL_SCHEMA} COMMIT;`);
  return db;
}

test('new database migrates to v2 and seeds default templates', () => {
  const db = freshV1();
  try {
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_2_SQL} COMMIT;`);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM shift_templates').get().n, 4);
    assert.equal(
      db.prepare("SELECT break_minutes FROM shift_templates WHERE id = 'night'").get()
        .break_minutes,
      0,
    );
  } finally {
    db.close();
  }
});

test('existing v1 cycle, overrides and edited templates survive migration', () => {
  const db = freshV1();
  try {
    db.exec(`
      INSERT INTO shift_templates (id, name, color, starts_at_local, ends_at_local, is_rest_day)
      VALUES ('morning', 'Morning edited', '#56A3FF', '08:00', '16:00', 0);
      INSERT INTO shift_patterns (id, anchor_date, timezone_id)
      VALUES ('primary', '2026-01-01', 'Europe/Istanbul');
      INSERT INTO pattern_days (pattern_id, day_index, shift_code)
      VALUES ('primary', 0, 'morning');
      INSERT INTO day_overrides (date, shift_code, note)
      VALUES ('2026-01-02', 'off', 'rest');
    `);
    db.exec(`BEGIN IMMEDIATE; ${MIGRATION_2_SQL} COMMIT;`);
    const row = db.prepare("SELECT * FROM shift_templates WHERE id = 'morning'").get();
    assert.equal(row.name, 'Morning edited');
    assert.equal(row.starts_at_local, '08:00');
    assert.equal(row.break_minutes, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pattern_days').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM day_overrides').get().n, 1);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 2);
  } finally {
    db.close();
  }
});
