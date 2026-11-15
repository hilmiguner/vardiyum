import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
  MIGRATION_5_SQL, MIGRATION_6_SQL, MIGRATION_7_SQL, MIGRATION_8_SQL,
} from '../src/data/schema.ts';
import {
  attributionEventKey, attributionHeadKey, attributionPrefix,
  createCustomAdjustmentAttributionEvent,
  customAdjustmentCandidatePeriods,
  decodeCustomAdjustmentAttributionHistory,
} from '../src/domain/custom-adjustment-attribution.ts';
import {
  appendCustomAdjustmentAttribution,
  loadCustomAdjustmentReportFromStore,
  readCustomAdjustmentHistory,
} from '../src/domain/custom-adjustment-attribution-store.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const DAY = 26;
const EARLIER = '2026-10';
const LATER = '2026-11';
const STAMP1 = '2026-11-16T09:00:00.000Z';
const STAMP2 = '2026-11-16T09:01:00.000Z';

function adjustment(overrides = {}) {
  return {
    id: 'bonus_nov',
    periodKey: '2026-11',
    kind: 'bonus',
    currency: 'TRY',
    amountMinorUnits: 123_456,
    note: 'User-reported attendance bonus',
    source: 'user_entered',
    createdAt: '2026-11-15T10:00:00.000Z',
    ...overrides,
  };
}
function dbV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const sql of [
    INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
    MIGRATION_5_SQL, MIGRATION_6_SQL, MIGRATION_7_SQL, MIGRATION_8_SQL,
  ]) db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}
function store(db) {
  return {
    async getFirstAsync(sql, ...values) {
      return db.prepare(sql).get(...values) ?? null;
    },
    async getAllAsync(sql, ...values) {
      return db.prepare(sql).all(...values);
    },
    async runAsync(sql, ...values) {
      return db.prepare(sql).run(...values);
    },
  };
}
async function fixture() {
  const db = dbV8();
  await writePayPeriodStartDay(store(db), DAY);
  return db;
}
function insertAdjustment(db, row) {
  db.prepare(
    'INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,' +
    "note,source,created_at) VALUES(?,?,?,?,?,?,'user_entered',?)",
  ).run(
    row.id, row.periodKey, row.kind, row.currency, row.amountMinorUnits,
    row.note, row.createdAt,
  );
}
function saveInput(id, first, expected = 0, stamp = STAMP1, extra = {}) {
  return {
    adjustmentId: id, startDay: DAY, earlierMinorUnits: first,
    expectedRevision: expected, reason: 'Explicit user attribution across payroll periods',
    recordedAt: stamp, ...extra,
  };
}
async function transaction(db, fn, adapter = store(db)) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = await fn(adapter);
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
async function save(db, id, first, expected = 0, stamp = STAMP1, extra = {}) {
  return transaction(db, adapter => appendCustomAdjustmentAttribution(
    adapter, saveInput(id, first, expected, stamp, extra),
  ));
}
function auditRows(db) {
  return db.prepare(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
  ).all(
    attributionPrefix(DAY, 'bonus_nov').length,
    attributionPrefix(DAY, 'bonus_nov'),
  );
}

test('civil month source gives exactly two adjacent custom periods, never day-based proration', () => {
  const source = adjustment();
  assert.deepEqual(customAdjustmentCandidatePeriods(source, DAY), {
    earlierPeriodKey: EARLIER,
    laterPeriodKey: LATER,
  });
  const event = createCustomAdjustmentAttributionEvent(
    source, DAY, 43_211, 1, 'Actual user allocation', STAMP1,
  );
  assert.equal(event.earlierMinorUnits, 43_211);
  assert.equal(event.laterMinorUnits, 80_245);
  assert.equal(event.earlierMinorUnits + event.laterMinorUnits, source.amountMinorUnits);
  assert.equal(event.original.id, source.id);
  assert.equal(event.original.createdAt, source.createdAt);
  assert.equal(event.earlierPeriodKey, '2026-10');
  assert.equal(event.laterPeriodKey, '2026-11');
  assert.equal(event.source, 'user_entered');
});

test('negative deductions and signed corrections are partitioned without sign inversion', () => {
  for (const source of [
    adjustment({ id: 'deduction_nov', kind: 'deduction', amountMinorUnits: -12_345 }),
    adjustment({ id: 'correction_nov', kind: 'correction', amountMinorUnits: -5_001 }),
    adjustment({ id: 'positive_correction', kind: 'correction', amountMinorUnits: 6_001 }),
  ]) {
    const first = Math.trunc(source.amountMinorUnits / 3);
    const event = createCustomAdjustmentAttributionEvent(
      source, DAY, first, 1, 'Explicit signed adjustment division', STAMP1,
    );
    assert.equal(event.earlierMinorUnits + event.laterMinorUnits, source.amountMinorUnits);
    assert.equal(Math.sign(event.earlierMinorUnits), Math.sign(source.amountMinorUnits));
    assert.equal(Math.sign(event.laterMinorUnits), Math.sign(source.amountMinorUnits));
  }
  for (const first of [12_346, -1, -20_000]) {
    assert.throws(() => createCustomAdjustmentAttributionEvent(
      adjustment(), DAY, first, 1, 'Invalid source over-allocation', STAMP1,
    ), /CUSTOM_ADJUSTMENT_SPLIT_EXCEEDS_SOURCE/);
  }
  assert.throws(() => createCustomAdjustmentAttributionEvent(
    adjustment({ kind: 'deduction', amountMinorUnits: -5_000 }),
    DAY, 1, 1, 'Sign inversion', STAMP1,
  ), /CUSTOM_ADJUSTMENT_SPLIT_EXCEEDS_SOURCE/);
});

test('zero to full source assigned to exactly one sibling period are both explicit valid choices', () => {
  for (const first of [0, 123_456]) {
    const split = createCustomAdjustmentAttributionEvent(
      adjustment(), DAY, first, 1, 'Explicit all-or-nothing allocation', STAMP1,
    );
    assert.equal(split.earlierMinorUnits, first);
    assert.equal(split.laterMinorUnits, 123_456 - first);
  }
});

test('missing source attribution blocks all verified subtotals, even with another source ready', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    insertAdjustment(db, adjustment({
      id: 'deduction_oct', periodKey: '2026-10', kind: 'deduction',
      amountMinorUnits: -10_000,
    }));
    const missing = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(missing.status, 'requires_attribution');
    assert.equal(missing.pendingCount, 2);
    assert.deepEqual(missing.totals, []);
    assert.equal(missing.candidates.length, 2);
    assert.equal(missing.candidates[0].amountInSelectedPeriodMinorUnits, null);

    await save(db, 'bonus_nov', 43_211);
    const half = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(half.pendingCount, 1);
    assert.deepEqual(half.totals, []);
    assert.equal(half.status, 'requires_attribution');
  } finally { db.close(); }
});

test('one source decision is read identically from two adjacent custom periods; neither duplicates source', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    const first = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    const second = await loadCustomAdjustmentReportFromStore(store(db), LATER);
    assert.equal(first.status, 'requires_attribution');
    assert.equal(second.status, 'requires_attribution');
    await save(db, 'bonus_nov', 43_211);
    const [older, newer] = await Promise.all([
      loadCustomAdjustmentReportFromStore(store(db), EARLIER),
      loadCustomAdjustmentReportFromStore(store(db), LATER),
    ]);
    assert.equal(older.status, 'verified');
    assert.equal(newer.status, 'verified');
    assert.equal(older.pendingCount, 0);
    assert.equal(newer.pendingCount, 0);
    assert.deepEqual(older.totals, [{ currency: 'TRY', minorUnits: 43_211 }]);
    assert.deepEqual(newer.totals, [{ currency: 'TRY', minorUnits: 80_245 }]);
    assert.equal(older.totals[0].minorUnits + newer.totals[0].minorUnits, 123_456);
    assert.equal(older.candidates[0].adjustmentId, newer.candidates[0].adjustmentId);
    assert.equal(older.candidates[0].revision, 1);
    assert.equal(newer.candidates[0].revision, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 1);
    assert.equal(db.prepare('SELECT amount_minor_units FROM earnings_adjustments').get().amount_minor_units, 123_456);
  } finally { db.close(); }
});

test('two source calendar months overlap one special pay period without double counting', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment({
      id: 'oct_bonus', periodKey: '2026-10',
      amountMinorUnits: 50_000,
    }));
    insertAdjustment(db, adjustment());
    await save(db, 'oct_bonus', 10_000); // Oct source: 10,000 in Sep, 40,000 in Oct
    await save(db, 'bonus_nov', 43_211); // Nov source: 43,211 in Oct, 80,245 in Nov
    const oct = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(oct.status, 'verified');
    assert.equal(oct.candidates.length, 2);
    assert.deepEqual(oct.totals, [{ currency: 'TRY', minorUnits: 83_211 }]);
    const nov = await loadCustomAdjustmentReportFromStore(store(db), LATER);
    assert.deepEqual(nov.totals, [{ currency: 'TRY', minorUnits: 80_245 }]);
    const sep = await loadCustomAdjustmentReportFromStore(store(db), '2026-09');
    assert.deepEqual(sep.totals, [{ currency: 'TRY', minorUnits: 10_000 }]);
    assert.equal(
      sep.totals[0].minorUnits + oct.totals[0].minorUnits + nov.totals[0].minorUnits,
      173_456,
    );
  } finally { db.close(); }
});

test('negative bonus/deduction/correction results net exact signed minor units', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    insertAdjustment(db, adjustment({
      id: 'deduct_nov', kind: 'deduction',
      amountMinorUnits: -25_000,
    }));
    insertAdjustment(db, adjustment({
      id: 'corr_nov', kind: 'correction',
      amountMinorUnits: -2_001,
    }));
    await save(db, 'bonus_nov', 40_000);
    await save(db, 'deduct_nov', -10_000);
    await save(db, 'corr_nov', -501);
    const first = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    const second = await loadCustomAdjustmentReportFromStore(store(db), LATER);
    assert.deepEqual(first.totals, [{ currency: 'TRY', minorUnits: 29_499 }]);
    assert.deepEqual(second.totals, [{ currency: 'TRY', minorUnits: 66_956 }]);
    assert.equal(first.totals[0].minorUnits + second.totals[0].minorUnits, 96_455);
    assert.equal(123_456 - 25_000 - 2_001, 96_455);
  } finally { db.close(); }
});

test('different currencies show separate subtotals without inferred FX', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    insertAdjustment(db, adjustment({
      id: 'usd_nov', currency: 'USD', amountMinorUnits: 30_000,
    }));
    await save(db, 'bonus_nov', 23_456);
    await save(db, 'usd_nov', 10_000);
    const report = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(report.status, 'verified');
    assert.deepEqual(report.totals, [
      { currency: 'TRY', minorUnits: 23_456 },
      { currency: 'USD', minorUnits: 10_000 },
    ]);
    assert.equal('totalMinorUnits' in report, false);
  } finally { db.close(); }
});

test('corrected split appends immutable revision, atomically updates BOTH period reports', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    const old = await save(db, 'bonus_nov', 43_211);
    const previousBytes = db.prepare('SELECT value FROM app_settings WHERE key=?')
      .get(attributionEventKey(DAY, 'bonus_nov', 1)).value;
    const update = await save(db, 'bonus_nov', 50_000, 1, STAMP2);
    assert.equal(old.revision, 1);
    assert.equal(update.revision, 2);
    assert.equal(update.earlierMinorUnits, 50_000);
    assert.equal(update.laterMinorUnits, 73_456);
    const history = await readCustomAdjustmentHistory(store(db), 'bonus_nov', DAY);
    assert.deepEqual(history.map(item => item.earlierMinorUnits), [43_211, 50_000]);
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?')
        .get(attributionEventKey(DAY, 'bonus_nov', 1)).value,
      previousBytes,
    );
    assert.equal(previousBytes, JSON.stringify(old));
    assert.deepEqual(
      (await loadCustomAdjustmentReportFromStore(store(db), EARLIER)).totals,
      [{ currency: 'TRY', minorUnits: 50_000 }],
    );
    assert.deepEqual(
      (await loadCustomAdjustmentReportFromStore(store(db), LATER)).totals,
      [{ currency: 'TRY', minorUnits: 73_456 }],
    );
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?')
        .get(attributionHeadKey(DAY, 'bonus_nov')).value,
      '2',
    );
  } finally { db.close(); }
});

test('stale revision, unchanged allocation and invalid input are rejected without partial writes', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await save(db, 'bonus_nov', 40_000);
    const invalid = [
      saveInput('bonus_nov', 40_001, 0, STAMP2),
      saveInput('bonus_nov', 40_000, 1, STAMP2),
      saveInput('bonus_nov', 40_001, 1, STAMP2, { reason: 'x' }),
      saveInput('bonus_nov', 40_001, 1, 'invalid date'),
      saveInput('bonus_nov', 40_001, 1, STAMP2, { startDay: 25 }),
      saveInput('bonus_nov', 123_457, 1, STAMP2),
      saveInput('bonus_nov', -1, 1, STAMP2),
      saveInput('bonus_nov', 1.2, 1, STAMP2),
      saveInput('missing_id', 0, 0, STAMP2),
    ];
    for (const bad of invalid) {
      await assert.rejects(() =>
        transaction(db, store =>
          appendCustomAdjustmentAttribution(store, bad)),
      );
    }
    assert.equal((await readCustomAdjustmentHistory(store(db), 'bonus_nov', DAY)).length, 1);
    assert.equal(auditRows(db).length, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 1);
  } finally { db.close(); }
});

test('direct source edit creates an untrusted stale source, not a newly approved allocation', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await save(db, 'bonus_nov', 40_000);
    db.prepare('UPDATE earnings_adjustments SET amount_minor_units=? WHERE id=?')
      .run(200_000, 'bonus_nov');
    const report = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(report.status, 'requires_attribution');
    assert.equal(report.pendingCount, 1);
    assert.equal(report.candidates[0].stale, true);
    assert.deepEqual(report.totals, []);
    await assert.rejects(
      () => save(db, 'bonus_nov', 60_000, 1, STAMP2),
      /CUSTOM_ADJUSTMENT_SOURCE_CHANGED/,
    );
    assert.equal(
      db.prepare('SELECT amount_minor_units FROM earnings_adjustments').get().amount_minor_units,
      200_000,
    );
  } finally { db.close(); }
});

test('missing head, tampered source snapshot and event gap fail closed on readback', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await save(db, 'bonus_nov', 40_000);
    const key = attributionEventKey(DAY, 'bonus_nov', 1);
    const sourceBytes = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(
      sourceBytes.replace('"amountMinorUnits":123456', '"amountMinorUnits":123457'), key,
    );
    await assert.rejects(
      () => readCustomAdjustmentHistory(store(db), 'bonus_nov', DAY),
      /INVALID_CUSTOM_ADJUSTMENT_EVENT/,
    );
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(sourceBytes, key);
    db.prepare('DELETE FROM app_settings WHERE key=?').run(
      attributionHeadKey(DAY, 'bonus_nov'),
    );
    await assert.rejects(
      () => readCustomAdjustmentHistory(store(db), 'bonus_nov', DAY),
      /INVALID_CUSTOM_ADJUSTMENT_HEAD/,
    );
    assert.throws(
      () => decodeCustomAdjustmentAttributionHistory(DAY, 'bonus_nov', [
        { key: attributionHeadKey(DAY, 'bonus_nov'), value: '1' },
        { key: attributionEventKey(DAY, 'bonus_nov', 2), value: sourceBytes },
      ]), /CUSTOM_ADJUSTMENT_EVENT_GAP/,
    );
  } finally { db.close(); }
});

test('simulated event/head write failure rolls back all changes atomically', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    const broken = {
      ...store(db),
      async runAsync(sql, ...params) {
        if (sql.startsWith('INSERT INTO app_settings') && params[0].endsWith(':head'))
          throw new Error('SIMULATED_WRITE_INTERRUPTION');
        return db.prepare(sql).run(...params);
      },
    };
    await assert.rejects(
      () => transaction(
        db,
        store => appendCustomAdjustmentAttribution(
          store, saveInput('bonus_nov', 40_000),
        ),
        broken,
      ),
      /SIMULATED_WRITE_INTERRUPTION/,
    );
    assert.equal(auditRows(db).length, 0);
    assert.equal(
      (await loadCustomAdjustmentReportFromStore(store(db), EARLIER)).status,
      'requires_attribution',
    );
  } finally { db.close(); }
});

test('literal underscore source IDs are isolated from wildcard and adjacent startDay streams', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await save(db, 'bonus_nov', 40_000);
    assert.notEqual(attributionPrefix(DAY, 'bonus_nov'), attributionPrefix(DAY, 'bonusXnov'));
    assert.notEqual(attributionPrefix(DAY, 'bonus_nov'), attributionPrefix(25, 'bonus_nov'));
    db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run(
      attributionHeadKey(DAY, 'bonusXnov'), '99',
    );
    assert.equal((await readCustomAdjustmentHistory(store(db), 'bonus_nov', DAY)).length, 1);
  } finally { db.close(); }
});

test('day1 retains the legacy calendar monthly adjustment report untouched', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await writePayPeriodStartDay(store(db), 1);
    const report = await loadCustomAdjustmentReportFromStore(store(db), EARLIER);
    assert.equal(report.status, 'disabled');
    await assert.rejects(
      () => save(db, 'bonus_nov', 40_000),
      /CUSTOM_ADJUSTMENT_SETTING_CHANGED/,
    );
    assert.equal(auditRows(db).length, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 1);
  } finally { db.close(); }
});

test('v1 to v8 SQLite schema and encrypted backup-compatible 18-table contract unchanged', async () => {
  const db = await fixture();
  try {
    insertAdjustment(db, adjustment());
    await save(db, 'bonus_nov', 43_211);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n,
      18,
    );
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 1);
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocation_events').get().n,
      0,
    );
  } finally { db.close(); }
});
