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
  createFixedTransitionBaseEvent,
  decodeFixedTransitionHistory,
  eligibleFixedTransition,
  fixedTransitionEventKey,
  fixedTransitionHeadKey,
  fixedTransitionMatchesPlan,
} from '../src/domain/custom-fixed-transition-policy.ts';
import {
  appendFixedTransitionBaseRevision,
  loadFixedTransitionBaseReviewFromStore,
  readFixedTransitionHistory,
} from '../src/domain/custom-fixed-transition-store.ts';
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';
import { loadCustomPayCombinedFromStore } from '../src/domain/custom-pay-combined-store.ts';

const PERIOD = '2026-10';
const DAY = 26;
const ZONE = 'Europe/Istanbul';
const STAMP1 = '2026-11-16T08:00:00.000Z';
const STAMP2 = '2026-11-16T08:01:00.000Z';
function profile(id, date, base = 2_000_000, overrides = {}) {
  return {
    id,
    effectiveFrom: date,
    model: 'monthly_fixed',
    currency: 'TRY',
    baseMinorUnits: base,
    overtimeHourlyMinorUnits: 20_000,
    overtimeAfterMinutes: 160 * 60,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
function plan(
  a = profile('old', '2026-10-01'),
  b = profile('new', '2026-11-01', 2_750_000),
  zone = ZONE,
) {
  return planCustomPayProfiles(PERIOD, DAY, zone, [a, b]);
}
function dbV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const migration of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ])
    db.exec('BEGIN IMMEDIATE;' + migration + 'COMMIT;');
  return db;
}
function adapter(db) {
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
function insertProfile(db, p) {
  db.prepare(
    'INSERT INTO earnings_profiles(' +
      'id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,' +
      'overtime_multiplier_numerator,overtime_multiplier_denominator,revision,source)' +
      " VALUES(?,?,?,?,?,?,?,?,?,?,'user_entered')",
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
function addCorrection(db, old, base) {
  db.prepare(
    'INSERT INTO earnings_profile_revisions(' +
      'profile_id,revision,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,' +
      'overtime_multiplier_numerator,overtime_multiplier_denominator,reason,recorded_at,source)' +
      " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    old.id,
    2,
    old.effectiveFrom,
    old.model,
    old.currency,
    base,
    old.overtimeHourlyMinorUnits,
    old.overtimeAfterMinutes,
    old.overtimeMultiplierNumerator,
    old.overtimeMultiplierDenominator,
    'User corrected immutable fixed salary',
    STAMP2,
  );
}
async function fixture(
  first = profile('old', '2026-10-01'),
  second = profile('new', '2026-11-01', 2_750_000),
  startDay = DAY,
) {
  const db = dbV8();
  await writePayPeriodStartDay(adapter(db), startDay);
  insertProfile(db, first);
  insertProfile(db, second);
  return db;
}
async function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = await fn(adapter(db));
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
async function declare(
  db,
  amounts = [850_000, 2_000_000],
  expectedRevision = 0,
  recordedAt = STAMP1,
  timeZone = ZONE,
) {
  return tx(db, (store) =>
    appendFixedTransitionBaseRevision(store, {
      periodKey: PERIOD,
      startDay: DAY,
      scheduleTimeZone: timeZone,
      declaredBaseMinorUnits: amounts,
      expectedRevision,
      reason: 'Contractual segment base amount chosen by user',
      recordedAt,
    }),
  );
}

test('pure two fixed segment source, saved IANA UTC and explicit partial values only', () => {
  const current = plan();
  assert.equal(current.status, 'profile_transition_review_required');
  const segments = eligibleFixedTransition(current);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].endInstantUtc, segments[1].startInstantUtc);
  assert.equal(segments[0].endDateInclusive, '2026-10-31');
  assert.equal(segments[1].startDate, '2026-11-01');
  const event = createFixedTransitionBaseEvent(
    current,
    [850_000, 2_000_000],
    1,
    'User agreed contractual change',
    STAMP1,
  );
  assert.equal(event.declaredBaseTotalMinorUnits, 2_850_000);
  assert.equal(event.segments[0].declaredBaseMinorUnits, 850_000);
  assert.equal(event.segments[1].declaredBaseMinorUnits, 2_000_000);
  assert.equal(event.currency, 'TRY');
  assert.equal(event.source, 'user_entered');
  assert.equal(event.revision, 1);
  assert.equal(fixedTransitionMatchesPlan(current, event), true);
  assert.equal(event.segments[0].profile.id, 'old');
  assert.equal(event.segments[1].profile.id, 'new');
});

test('zero/full amounts work; negatives, fractions, >source, invalid reason or timestamp fail closed', () => {
  const current = plan();
  assert.equal(
    createFixedTransitionBaseEvent(current, [0, 2_750_000], 1, 'Manual source decision', STAMP1)
      .declaredBaseTotalMinorUnits,
    2_750_000,
  );
  for (const bad of [
    [-1, 0],
    [0.5, 0],
    [2_000_001, 0],
    [0, 2_750_001],
    [Number.MAX_SAFE_INTEGER, 0],
    [0],
    [],
    [0, 0, 0],
  ])
    assert.throws(
      () => createFixedTransitionBaseEvent(current, bad, 1, 'Intentional', STAMP1),
      /INVALID_FIXED_TRANSITION_SEGMENT_AMOUNT|TWO_AMOUNTS_REQUIRED/,
    );
  assert.throws(
    () => createFixedTransitionBaseEvent(current, [0, 0], 0, 'Intentional', STAMP1),
    /FIXED_TRANSITION_REVISION_LIMIT/,
  );
  assert.throws(
    () => createFixedTransitionBaseEvent(current, [0, 0], 1, 'xx', STAMP1),
    /INVALID_FIXED_TRANSITION_REASON/,
  );
  assert.throws(
    () =>
      createFixedTransitionBaseEvent(
        current,
        [0, 0],
        1,
        'Intentional',
        '2026-11-16T99:00:00.000Z',
      ),
    /INVALID_FIXED_TRANSITION_TIMESTAMP/,
  );
});

test('mixed fixed-hourly and FX/missing profile never become an approved BASE split', () => {
  const missing = planCustomPayProfiles(PERIOD, DAY, ZONE, []);
  assert.throws(() => eligibleFixedTransition(missing), /TWO_PROFILES_REQUIRED/);
  const mixed = plan(
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01', 3_000_000, {
      model: 'hourly',
      overtimeHourlyMinorUnits: 0,
    }),
  );
  assert.throws(() => eligibleFixedTransition(mixed), /MODEL_NOT_SUPPORTED/);
  const foreign = plan(
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01', 2_000_000, { currency: 'EUR' }),
  );
  assert.throws(() => eligibleFixedTransition(foreign), /CURRENCY_NO_FX/);
  const single = planCustomPayProfiles(PERIOD, DAY, ZONE, [profile('old', '2026-10-01')]);
  assert.throws(() => eligibleFixedTransition(single), /TWO_PROFILES_REQUIRED/);
});

test('history needs exact event/head, canonical sources and strict immutable revision chain', () => {
  const one = createFixedTransitionBaseEvent(
    plan(),
    [800_000, 900_000],
    1,
    'First explicit source allocation',
    STAMP1,
  );
  const rows = [
    { key: fixedTransitionHeadKey(PERIOD, DAY), value: '1' },
    { key: fixedTransitionEventKey(PERIOD, DAY, 1), value: JSON.stringify(one) },
  ];
  assert.deepEqual(decodeFixedTransitionHistory(PERIOD, DAY, rows), [one]);
  for (const bad of [
    [{ ...rows[0], value: '2' }, rows[1]],
    [rows[0], { ...rows[1], key: fixedTransitionEventKey(PERIOD, DAY, 2) }],
    [
      rows[0],
      { ...rows[1], value: JSON.stringify({ ...one, declaredBaseTotalMinorUnits: 1 }) },
    ],
    [
      rows[0],
      {
        ...rows[1],
        value: JSON.stringify({
          ...one,
          segments: [
            one.segments[0],
            {
              ...one.segments[1],
              profile: {
                ...one.segments[1].profile,
                baseMinorUnits: -1,
              },
            },
          ],
        }),
      },
    ],
    [{ ...rows[0], key: 'unrelated-head' }, rows[1]],
  ])
    assert.throws(
      () => decodeFixedTransitionHistory(PERIOD, DAY, bad),
      /INVALID_FIXED_TRANSITION_HEAD|INVALID_FIXED_TRANSITION_EVENT|EVENT_GAP/,
    );
});

test('real v1→v8 SQLite persists exact two-source revision without changing originals', async () => {
  const db = await fixture();
  try {
    const initial = await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(initial.status, 'review');
    assert.equal(initial.declaredBaseTotalMinorUnits, null);
    const saved = await declare(db);
    assert.equal(saved.declaredBaseTotalMinorUnits, 2_850_000);
    const result = await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(result.status, 'review');
    assert.equal(result.latestRevision, 1);
    assert.equal(result.stale, false);
    assert.equal(result.declaredBaseTotalMinorUnits, 2_850_000);
    assert.deepEqual(
      result.segments.map((x) => x.declaredBaseMinorUnits),
      [850_000, 2_000_000],
    );
    assert.equal((await readFixedTransitionHistory(adapter(db), PERIOD, DAY)).length, 1);
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
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 0);
    const combined = await loadCustomPayCombinedFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(combined.status, 'blocked');
    assert.ok(combined.reasons.some((x) => /MIXED_FIXED/.test(x)));
  } finally {
    db.close();
  }
});

test('correction rev2 keeps immutable rev1 bytes and enforces stale optimistic head', async () => {
  const db = await fixture();
  try {
    await declare(db);
    const originalKey = fixedTransitionEventKey(PERIOD, DAY, 1);
    const original = db
      .prepare('SELECT value FROM app_settings WHERE key=?')
      .get(originalKey).value;
    await assert.rejects(
      () => declare(db, [800_000, 1_000_000], 0, STAMP2),
      /STALE_FIXED_TRANSITION_REVISION/,
    );
    await assert.rejects(
      () => declare(db, [850_000, 2_000_000], 1, STAMP2),
      /UNCHANGED_FIXED_TRANSITION_CHOICE/,
    );
    await declare(db, [800_000, 1_000_000], 1, STAMP2);
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?').get(originalKey).value,
      original,
    );
    const history = await readFixedTransitionHistory(adapter(db), PERIOD, DAY);
    assert.equal(history.length, 2);
    assert.equal(history[1].revision, 2);
    assert.equal(
      (await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE))
        .declaredBaseTotalMinorUnits,
      1_800_000,
    );
  } finally {
    db.close();
  }
});

test('corrected historical profile stales source; new signed decision rebinds revision', async () => {
  const db = await fixture();
  try {
    await declare(db);
    addCorrection(db, profile('new', '2026-11-01', 2_750_000), 3_000_000);
    const stale = await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(stale.status, 'review');
    assert.equal(stale.stale, true);
    assert.equal(stale.declaredBaseTotalMinorUnits, null);
    assert.deepEqual(
      stale.segments.map((x) => x.declaredBaseMinorUnits),
      [null, null],
    );
    await declare(db, [850_000, 2_100_000], 1, STAMP2);
    const newReview = await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(newReview.stale, false);
    assert.equal(newReview.declaredBaseTotalMinorUnits, 2_950_000);
    const history = await readFixedTransitionHistory(adapter(db), PERIOD, DAY);
    assert.equal(history[0].segments[1].profile.revision, 1);
    assert.equal(history[1].segments[1].profile.revision, 2);
  } finally {
    db.close();
  }
});

test('changed saved schedule zone requires fresh explicit choice, without rewriting old event', async () => {
  const db = await fixture();
  try {
    await declare(db);
    const foreign = await loadFixedTransitionBaseReviewFromStore(
      adapter(db),
      PERIOD,
      'Asia/Kathmandu',
    );
    assert.equal(foreign.stale, true);
    assert.equal(foreign.declaredBaseTotalMinorUnits, null);
    await declare(db, [0, 2_000_000], 1, STAMP2, 'Asia/Kathmandu');
    const current = await loadFixedTransitionBaseReviewFromStore(
      adapter(db),
      PERIOD,
      'Asia/Kathmandu',
    );
    assert.equal(current.status, 'review');
    assert.equal(current.stale, false);
    assert.equal(current.timeZone, 'Asia/Kathmandu');
    const previous = (await readFixedTransitionHistory(adapter(db), PERIOD, DAY))[0];
    assert.equal(previous.scheduleTimeZone, 'Europe/Istanbul');
  } finally {
    db.close();
  }
});

test('injected head-write failure rolls back new immutable event and pointer atomically', async () => {
  const db = await fixture();
  try {
    const failing = {
      ...adapter(db),
      async runAsync(sql, ...params) {
        if (sql.startsWith('UPDATE app_settings SET value'))
          throw new Error('INJECTED_HEAD_UPDATE_FAILURE');
        return adapter(db).runAsync(sql, ...params);
      },
    };
    await declare(db);
    await assert.rejects(
      () =>
        tx(db, (store) =>
          appendFixedTransitionBaseRevision(
            { ...store, runAsync: failing.runAsync },
            {
              periodKey: PERIOD,
              startDay: DAY,
              scheduleTimeZone: ZONE,
              declaredBaseMinorUnits: [500_000, 500_000],
              expectedRevision: 1,
              reason: 'Intentional change in contract',
              recordedAt: STAMP2,
            },
          ),
        ),
      /INJECTED_HEAD_UPDATE_FAILURE/,
    );
    assert.equal((await readFixedTransitionHistory(adapter(db), PERIOD, DAY)).length, 1);
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE ?')
        .get('earnings_custom_fixed_transition_base_v1:%').n,
      2,
    );
  } finally {
    db.close();
  }
});

test('day1 calendar route remains isolated and user preference is not rewritten', async () => {
  const db = await fixture(
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01', 2_750_000),
    1,
  );
  try {
    const view = await loadFixedTransitionBaseReviewFromStore(adapter(db), PERIOD, ZONE);
    assert.equal(view.status, 'not_applicable');
    await assert.rejects(() => declare(db), /FIXED_TRANSITION_START_DAY_CHANGED/);
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE ?')
        .get('earnings_custom_fixed_transition_base_v1:%').n,
      0,
    );
  } finally {
    db.close();
  }
});

test('year turnover + UTC+05:45 source boundary never silently day-prorates', () => {
  const preview = planCustomPayProfiles('2026-12', 26, 'Asia/Kathmandu', [
    profile('dec', '2026-12-01'),
    profile('jan', '2027-01-01', 3_000_000),
  ]);
  const value = createFixedTransitionBaseEvent(
    preview,
    [1, 7],
    1,
    'Explicit tiny source allocations',
    STAMP1,
  );
  assert.equal(value.startDate, '2026-12-26');
  assert.equal(value.endDateInclusive, '2027-01-25');
  assert.equal(value.declaredBaseTotalMinorUnits, 8);
  assert.equal(value.segments[0].endInstantUtc, value.segments[1].startInstantUtc);
});
