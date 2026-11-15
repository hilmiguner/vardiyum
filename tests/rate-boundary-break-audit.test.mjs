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
  createRateBreakEvent,
  decodeRateBreakHistory,
  rateBreakEventKey,
  rateBreakHeadKey,
  rateBreakPrefix,
  rateBreakSource,
} from '../src/domain/rate-boundary-break-audit.ts';
import {
  appendRateBreakRevision,
  readRateBreakHistory,
  loadRateBreakCandidatesFromStore,
} from '../src/domain/rate-boundary-break-store.ts';
import { loadCustomHourlyEstimateFromStore } from '../src/domain/custom-hourly-work-store.ts';
import { estimateCustomHourlyWork } from '../src/domain/custom-hourly-work-estimate.ts';
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const PERIOD = '2026-10';
const RATE_DATE = '2026-11-01';
const WORK_ID = 'cross_rate';
const source = {
  id: WORK_ID,
  localDate: '2026-10-31',
  endDate: '2026-11-01',
  timeZone: 'Europe/Istanbul',
  startInstantUtc: '2026-10-31T20:00:00.000Z',
  endInstantUtc: '2026-10-31T22:00:00.000Z',
  breakMinutes: 30,
  source: 'user_entered',
};

function profile(id, effectiveFrom, rate, overrides = {}) {
  return {
    id,
    effectiveFrom,
    model: 'hourly',
    currency: 'TRY',
    baseMinorUnits: rate,
    overtimeHourlyMinorUnits: 0,
    overtimeAfterMinutes: 180,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
const oct = profile('old', '2026-10-01', 10000);
const nov = profile('new', '2026-11-01', 20000);
function plan(rows = [oct, nov]) {
  return planCustomPayProfiles(PERIOD, 26, 'Europe/Istanbul', rows);
}

function createDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ])
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}
function store(db) {
  return {
    async getFirstAsync(sql, ...params) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    async runAsync(sql, ...params) {
      return db.prepare(sql).run(...params);
    },
  };
}
function addProfile(db, p) {
  db.prepare(
    'INSERT INTO earnings_profiles (id,effective_from,model,currency,' +
      'base_minor_units,overtime_hourly_minor_units,overtime_after_minutes,' +
      "overtime_multiplier_numerator,overtime_multiplier_denominator,revision,source) VALUES (?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    p.id,
    p.effectiveFrom,
    p.model,
    p.currency,
    p.baseMinorUnits,
    p.overtimeHourlyMinorUnits,
    p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,
    p.overtimeMultiplierDenominator,
    p.revision,
  );
}
function addWork(db, w = source) {
  db.prepare(
    'INSERT INTO actual_work_sessions (id,local_date,start_clock,end_date,end_clock,' +
      'timezone_id,start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    w.id,
    w.localDate,
    '23:00',
    w.endDate,
    '01:00',
    w.timeZone,
    'reject',
    'reject',
    w.startInstantUtc,
    w.endInstantUtc,
    w.breakMinutes,
    'Reported work',
  );
}
async function fixture() {
  const db = createDb();
  await writePayPeriodStartDay(store(db), 26);
  addProfile(db, oct);
  addProfile(db, nov);
  addWork(db);
  return db;
}
function input(chosen, expectedRevision, recordedAt) {
  return {
    workId: WORK_ID,
    startDay: 26,
    periodKey: PERIOD,
    scheduleTimeZone: 'Europe/Istanbul',
    effectiveDate: RATE_DATE,
    beforeRateBreakMinutes: chosen,
    expectedRevision,
    reason: 'Break position from my actual work',
    recordedAt,
  };
}
async function append(db, choice, expectedRevision, timestamp, storeOverride) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const event = await appendRateBreakRevision(
      storeOverride ?? store(db),
      input(choice, expectedRevision, timestamp),
    );
    db.exec('COMMIT');
    return event;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
const STAMP_1 = '2026-11-15T18:00:00.000Z';
const STAMP_2 = '2026-11-15T18:01:00.000Z';

test('pure source split binds exact Istanbul rate midnight and limits each break side', () => {
  const boundary = rateBreakSource(source, 26, PERIOD, RATE_DATE);
  assert.equal(boundary.boundaryUtc, '2026-10-31T21:00:00.000Z');
  assert.equal(boundary.beforeSeconds, 3600);
  assert.equal(boundary.afterSeconds, 3600);
  assert.equal(boundary.portion.netSeconds, 90 * 60);
  const event = createRateBreakEvent(
    source,
    26,
    PERIOD,
    RATE_DATE,
    10,
    1,
    'User reported break timing',
    STAMP_1,
  );
  assert.equal(event.portionBreakMinutes, 30);
  assert.equal(event.beforeRateBreakMinutes, 10);
  assert.equal(event.originalStartUtc, source.startInstantUtc);
  assert.equal(event.originalEndUtc, source.endInstantUtc);
  assert.equal(event.rateBoundaryUtc, boundary.boundaryUtc);
  assert.throws(
    () => createRateBreakEvent(source, 26, PERIOD, RATE_DATE, 61, 1, 'Reason', STAMP_1),
    /RATE_BREAK_EXCEEDS_SEGMENT/,
  );
  assert.throws(
    () => createRateBreakEvent(source, 26, PERIOD, RATE_DATE, -1, 1, 'Reason', STAMP_1),
    /RATE_BREAK_EXCEEDS_SEGMENT/,
  );
  assert.throws(
    () => createRateBreakEvent(source, 26, PERIOD, RATE_DATE, 10, 1, 'no', STAMP_1),
    /INVALID_RATE_BREAK_REASON/,
  );
});

test('without audit amount blocks; after user declaration work is split and priced by two rates', async () => {
  const db = await fixture();
  try {
    const before = await loadCustomHourlyEstimateFromStore(
      store(db),
      PERIOD,
      'Europe/Istanbul',
    );
    assert.equal(before.status, 'blocked');
    assert.ok(before.reasons.includes('CUSTOM_RATE_BREAK_ALLOCATION_REQUIRED'));
    const candidates = await loadRateBreakCandidatesFromStore(
      store(db),
      PERIOD,
      'Europe/Istanbul',
    );
    assert.equal(candidates.startDay, 26);
    assert.equal(candidates.candidates.length, 1);
    assert.equal(candidates.candidates[0].chosenBeforeMinutes, null);
    assert.equal(candidates.candidates[0].maxBeforeMinutes, 60);
    assert.equal(candidates.candidates[0].maxAfterMinutes, 60);
    const first = await append(db, 10, 0, STAMP_1);
    assert.equal(first.revision, 1);
    const after = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(after.status, 'estimated');
    assert.equal(after.workOnlyMinorUnits, 21666);
    assert.equal(after.loggedSeconds, 90 * 60);
    assert.equal(after.lines.length, 2);
    assert.deepEqual(
      after.lines.map((line) => [
        line.profileId,
        line.sourceBreakMinutes,
        line.seconds,
        line.rateBreakAuditRevision,
      ]),
      [
        ['old', 10, 50 * 60, 1],
        ['new', 20, 40 * 60, 1],
      ],
    );
    assert.equal(after.lines[0].segmentEndUtc, after.lines[1].segmentStartUtc);
    assert.equal(after.lines[0].segmentEndUtc, '2026-10-31T21:00:00.000Z');
    assert.equal(
      after.lines.reduce((sum, line) => sum + line.amountMinorUnits, 0),
      after.workOnlyMinorUnits,
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
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});

test('correction is append-only; latest audit reprices without changing original actual work', async () => {
  const db = await fixture();
  try {
    const first = await append(db, 10, 0, STAMP_1);
    const firstJson = db
      .prepare('SELECT value FROM app_settings WHERE key=?')
      .get(rateBreakEventKey(WORK_ID, 26, PERIOD, 1)).value;
    const second = await append(db, 20, 1, STAMP_2);
    assert.equal(second.revision, 2);
    const history = await readRateBreakHistory(store(db), source, 26, PERIOD, RATE_DATE);
    assert.deepEqual(
      history.map((row) => row.beforeRateBreakMinutes),
      [10, 20],
    );
    assert.equal(JSON.stringify(first), firstJson);
    assert.equal(
      db
        .prepare('SELECT value FROM app_settings WHERE key=?')
        .get(rateBreakEventKey(WORK_ID, 26, PERIOD, 1)).value,
      firstJson,
    );
    assert.equal(
      db
        .prepare('SELECT value FROM app_settings WHERE key=?')
        .get(rateBreakHeadKey(WORK_ID, 26, PERIOD)).value,
      '2',
    );
    const current = await loadCustomHourlyEstimateFromStore(
      store(db),
      PERIOD,
      'Europe/Istanbul',
    );
    assert.equal(current.status, 'estimated');
    assert.equal(current.workOnlyMinorUnits, 23334);
    assert.deepEqual(
      current.lines.map((l) => l.rateBreakAuditRevision),
      [2, 2],
    );
    assert.equal(
      db.prepare('SELECT break_minutes FROM actual_work_sessions').get().break_minutes,
      30,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n,
      0,
    );
  } finally {
    db.close();
  }
});

test('stale UI, unchanged choice, invalid source timestamp and wrong reason roll back entirely', async () => {
  const db = await fixture();
  try {
    await append(db, 10, 0, STAMP_1);
    for (const trial of [
      input(20, 0, STAMP_2),
      input(10, 1, STAMP_2),
      input(20, 1, 'invalid'),
      { ...input(20, 1, STAMP_2), reason: 'x' },
      { ...input(20, 1, STAMP_2), effectiveDate: '2026-10-01' },
      { ...input(20, 1, STAMP_2), startDay: 27 },
    ]) {
      db.exec('BEGIN IMMEDIATE');
      try {
        await assert.rejects(() => appendRateBreakRevision(store(db), trial));
      } finally {
        db.exec('ROLLBACK');
      }
    }
    const history = await readRateBreakHistory(store(db), source, 26, PERIOD, RATE_DATE);
    assert.equal(history.length, 1);
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE ?')
        .get('earnings_rate_boundary_break_v1:%').n,
      2,
    );
  } finally {
    db.close();
  }
});

test('malformed audit, missing head, changed original source are rejected on readback', async () => {
  const db = await fixture();
  try {
    await append(db, 10, 0, STAMP_1);
    const key = rateBreakEventKey(WORK_ID, 26, PERIOD, 1);
    const original = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(
      original.replace('"beforeRateBreakMinutes":10', '"beforeRateBreakMinutes":11'),
      key,
    );
    await assert.rejects(
      () => readRateBreakHistory(store(db), source, 26, PERIOD, RATE_DATE),
      /INVALID_RATE_BREAK_EVENT/,
    );
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(original, key);
    db.prepare('DELETE FROM app_settings WHERE key=?').run(
      rateBreakHeadKey(WORK_ID, 26, PERIOD),
    );
    await assert.rejects(
      () => readRateBreakHistory(store(db), source, 26, PERIOD, RATE_DATE),
      /INVALID_RATE_BREAK_HEAD/,
    );
    const changed = { ...source, endInstantUtc: '2026-10-31T22:30:00.000Z' };
    await assert.rejects(() => readRateBreakHistory(store(db), changed, 26, PERIOD, RATE_DATE));
  } finally {
    db.close();
  }
});

test('temporary failure between event and head is rolled back by exclusive caller transaction', async () => {
  const db = await fixture();
  try {
    const adapter = {
      ...store(db),
      async runAsync(sql, ...args) {
        if (sql.startsWith('INSERT INTO app_settings') && args[0].endsWith(':head'))
          throw new Error('SIMULATED_DISK_FAILURE');
        return db.prepare(sql).run(...args);
      },
    };
    await assert.rejects(() => append(db, 10, 0, STAMP_1, adapter), /SIMULATED_DISK_FAILURE/);
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE ?')
        .get('earnings_rate_boundary_break_v1:%').n,
      0,
    );
    const report = await loadCustomHourlyEstimateFromStore(
      store(db),
      PERIOD,
      'Europe/Istanbul',
    );
    assert.equal(report.status, 'blocked');
  } finally {
    db.close();
  }
});

test('literal work IDs and separate periods do not collide via LIKE wildcard', async () => {
  const db = await fixture();
  try {
    await append(db, 10, 0, STAMP_1);
    assert.ok(
      rateBreakPrefix('cross_rate', 26, PERIOD) !== rateBreakPrefix('crossXrate', 26, PERIOD),
    );
    db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run(
      rateBreakPrefix('crossXrate', 26, PERIOD) + 'head',
      '999',
    );
    const history = await readRateBreakHistory(store(db), source, 26, PERIOD, RATE_DATE);
    assert.equal(history.length, 1);
    assert.equal(
      rateBreakHeadKey(WORK_ID, 27, PERIOD) === rateBreakHeadKey(WORK_ID, 26, PERIOD),
      false,
    );
    assert.equal(
      rateBreakHeadKey(WORK_ID, 26, '2026-11') === rateBreakHeadKey(WORK_ID, 26, PERIOD),
      false,
    );
  } finally {
    db.close();
  }
});

test('overlapping both pay-period and rate boundaries requires separate policy, never guess', () => {
  const acrossBoth = {
    ...source,
    id: 'both',
    localDate: '2026-10-31',
    endDate: '2026-11-02',
    startInstantUtc: '2026-10-31T20:00:00.000Z',
    endInstantUtc: '2026-11-01T23:00:00.000Z',
  };
  assert.throws(
    () => rateBreakSource(acrossBoth, 2, PERIOD, RATE_DATE),
    /RATE_BREAK_REQUIRES_SINGLE_PAY_PERIOD_WORK|PAY_PERIOD_BREAK_ALLOCATION_REQUIRED/,
  );
});

test('source IANA rate boundary is Kathmandu offset, not the schedule preview zone', () => {
  const ktm = {
    ...source,
    id: 'ktm',
    timeZone: 'Asia/Kathmandu',
    startInstantUtc: '2026-10-31T17:45:00.000Z',
    endInstantUtc: '2026-10-31T18:45:00.000Z',
  };
  const info = rateBreakSource(ktm, 26, PERIOD, RATE_DATE);
  assert.equal(info.boundaryUtc, '2026-10-31T18:15:00.000Z');
  const event = createRateBreakEvent(
    ktm,
    26,
    PERIOD,
    RATE_DATE,
    10,
    1,
    'User reported timing',
    STAMP_1,
  );
  assert.equal(event.rateBoundaryUtc, '2026-10-31T18:15:00.000Z');
});

test('profile transitions in other currencies and fixed salary do not permit saving a break audit', async () => {
  const db = createDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    addProfile(db, oct);
    addProfile(db, { ...nov, currency: 'USD' });
    addWork(db);
    await assert.rejects(() => append(db, 10, 0, STAMP_1), /RATE_BREAK_PROFILES_UNSUPPORTED/);
  } finally {
    db.close();
  }
});

test('pure estimator never trusts a fabricated rate audit, even when its break number seems valid', () => {
  const fake = createRateBreakEvent(
    source,
    26,
    PERIOD,
    RATE_DATE,
    10,
    1,
    'Valid reason text',
    STAMP_1,
  );
  const forged = { ...fake, originalEndUtc: '2026-10-31T22:15:00.000Z' };
  const response = estimateCustomHourlyWork(
    plan(),
    [{ work: source, rateBreakAudit: forged }],
    0,
  );
  assert.equal(response.status, 'blocked');
  assert.ok(response.reasons.includes('INVALID_RATE_BREAK_AUDIT_SOURCE'));
});

test('existing zero-break split, single-rate estimate and day1 remain independent', () => {
  const zero = { ...source, breakMinutes: 0 };
  const mix = estimateCustomHourlyWork(plan(), [{ work: zero }], 0);
  assert.equal(mix.status, 'estimated');
  assert.equal(mix.workOnlyMinorUnits, 30000);
  const single = planCustomPayProfiles(PERIOD, 26, 'Europe/Istanbul', [oct]);
  const old = estimateCustomHourlyWork(single, [{ work: source }], 0);
  assert.equal(old.status, 'estimated');
  assert.equal(old.workOnlyMinorUnits, 15000);
  const dayOne = planCustomPayProfiles('2026-11', 1, 'Europe/Istanbul', [oct, nov]);
  assert.equal(estimateCustomHourlyWork(dayOne, [{ work: source }], 0).status, 'disabled');
});
