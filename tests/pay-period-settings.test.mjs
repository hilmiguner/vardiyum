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
} from '../src/data/schema.ts';
import {
  PAY_PERIOD_START_DAY_KEY,
  decodePayPeriodStartDay,
  readPayPeriodStartDay,
  validatePayPeriodStartDay,
  writePayPeriodStartDay,
} from '../src/domain/pay-period-settings.ts';

function openV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const migration of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ]) {
    db.exec(`BEGIN IMMEDIATE; ${migration} COMMIT;`);
  }
  return db;
}

function asyncStore(db) {
  return {
    async getFirstAsync(sql, ...args) {
      return db.prepare(sql).get(...args) ?? null;
    },
    async runAsync(sql, ...args) {
      return db.prepare(sql).run(...args);
    },
  };
}

test('missing custom-period preference preserves exact calendar-month day 1', async () => {
  const db = openV8();
  try {
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(await readPayPeriodStartDay(asyncStore(db)), 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM app_settings').get().n, 0);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get().n,
      18,
    );
  } finally {
    db.close();
  }
});

test('user-selected start day survives reopening and is included in existing v8 app_settings', async () => {
  const db = openV8();
  try {
    const store = asyncStore(db);
    db.prepare('INSERT INTO app_settings (key,value) VALUES (?,?)').run(
      'keep_existing',
      'unchanged',
    );
    await writePayPeriodStartDay(store, 26);
    assert.equal(await readPayPeriodStartDay(store), 26);
    const backedUpSettings = db
      .prepare('SELECT key,value FROM app_settings ORDER BY key')
      .all();
    assert.deepEqual(
      backedUpSettings,
      [
        { key: PAY_PERIOD_START_DAY_KEY, value: '26' },
        { key: 'keep_existing', value: 'unchanged' },
      ].sort((a, b) => a.key.localeCompare(b.key)),
    );
    await writePayPeriodStartDay(store, 1);
    assert.equal(await readPayPeriodStartDay(store), 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM app_settings').get().n, 2);
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?').get('keep_existing').value,
      'unchanged',
    );
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get().n,
      18,
    );
  } finally {
    db.close();
  }
});

test('invalid setting inputs are rejected before changing SQLite records', async () => {
  const db = openV8();
  try {
    const store = asyncStore(db);
    await writePayPeriodStartDay(store, 26);
    for (const bad of [0, 29, 31, NaN, Infinity, 1.5, -4, '26', null, undefined]) {
      assert.throws(() => validatePayPeriodStartDay(bad), /INVALID_PAY_PERIOD_START_DAY/);
      await assert.rejects(
        () => writePayPeriodStartDay(store, bad),
        /INVALID_PAY_PERIOD_START_DAY/,
      );
    }
    assert.equal(await readPayPeriodStartDay(store), 26);
  } finally {
    db.close();
  }
});

test('corrupt/stale preference is never silently parsed, reset or overwritten', async () => {
  const db = openV8();
  try {
    const store = asyncStore(db);
    for (const value of [
      '0',
      '29',
      '31',
      ' 26',
      '26 ',
      '026',
      '1.0',
      '1e1',
      'NaN',
      '{}',
      '',
      'null',
    ]) {
      db.prepare(
        'INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      ).run(PAY_PERIOD_START_DAY_KEY, value);
      await assert.rejects(
        () => readPayPeriodStartDay(store),
        /INVALID_STORED_PAY_PERIOD_START_DAY/,
      );
      assert.equal(
        db.prepare('SELECT value FROM app_settings WHERE key=?').get(PAY_PERIOD_START_DAY_KEY)
          .value,
        value,
      );
    }
    assert.throws(
      () => decodePayPeriodStartDay({ value: null }),
      /INVALID_STORED_PAY_PERIOD_START_DAY/,
    );
  } finally {
    db.close();
  }
});

test('preserve v8 source data and foreign keys when changing the preference', async () => {
  const db = openV8();
  try {
    const store = asyncStore(db);
    const countBefore = db.prepare('SELECT COUNT(*) AS n FROM shift_templates').get().n;
    const versionBefore = db.prepare('PRAGMA user_version').get().user_version;
    const masterBefore = db
      .prepare(
        "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    await writePayPeriodStartDay(store, 28);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM shift_templates').get().n, countBefore);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, versionBefore);
    assert.deepEqual(
      db
        .prepare(
          "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all(),
      masterBefore,
    );
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});
