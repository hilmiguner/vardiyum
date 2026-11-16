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
import { createFixedTransitionBaseEvent } from '../src/domain/custom-fixed-transition-policy.ts';
import {
  appendFixedTransitionBaseRevision,
  readFixedTransitionHistory,
} from '../src/domain/custom-fixed-transition-store.ts';
import {
  createTwoFixedOvertimePolicyEvent,
  decodeTwoFixedOvertimePolicyHistory,
  twoFixedOvertimeEventKey,
  twoFixedOvertimeHeadKey,
  twoFixedOvertimePolicyMatches,
} from '../src/domain/two-fixed-overtime-policy.ts';
import {
  appendTwoFixedOvertimePolicyRevision,
  loadTwoFixedOvertimePolicyReviewFromStore,
  readTwoFixedOvertimePolicyHistory,
} from '../src/domain/two-fixed-overtime-store.ts';
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { loadCustomPayCombinedFromStore } from '../src/domain/custom-pay-combined-store.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const PERIOD = '2026-10';
const DAY = 26;
const ZONE = 'Europe/Istanbul';
const T1 = '2026-11-16T08:00:00.000Z';
const T2 = '2026-11-16T08:01:00.000Z';
const T3 = '2026-11-16T08:02:00.000Z';

function profile(id, effectiveFrom, overrides = {}) {
  return {
    id,
    effectiveFrom,
    model: 'monthly_fixed',
    currency: 'TRY',
    baseMinorUnits: 2_500_000,
    overtimeHourlyMinorUnits: 20_000,
    overtimeAfterMinutes: 9600,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
function plan(a = profile('old', '2026-10-01'), b = profile('new', '2026-11-01'), zone = ZONE) {
  return planCustomPayProfiles(PERIOD, DAY, zone, [a, b]);
}
function base(p = plan(), amounts = [850_000, 2_000_000], revision = 1, time = T1) {
  return createFixedTransitionBaseEvent(
    p,
    amounts,
    revision,
    'Explicit source BASE agreement',
    time,
  );
}
function policy(
  p = plan(),
  b = base(p),
  decision = 'include_logged_overtime',
  mode = 'carry_worked_time',
  revision = 1,
  time = T2,
) {
  return createTwoFixedOvertimePolicyEvent(
    p,
    b,
    decision,
    mode,
    revision,
    'User explicitly chose overtime treatment',
    time,
  );
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
async function tx(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = await callback(store(db));
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
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
function addRevision(db, p, amount) {
  db.prepare(
    'INSERT INTO earnings_profile_revisions(' +
      'profile_id,revision,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,' +
      'overtime_multiplier_numerator,overtime_multiplier_denominator,reason,recorded_at,source)' +
      " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    p.id,
    2,
    p.effectiveFrom,
    p.model,
    p.currency,
    amount,
    p.overtimeHourlyMinorUnits,
    p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,
    p.overtimeMultiplierDenominator,
    'Corrected source profile',
    T3,
  );
}
async function fixture(
  a = profile('old', '2026-10-01'),
  b = profile('new', '2026-11-01'),
  day = DAY,
) {
  const db = dbV8();
  await writePayPeriodStartDay(store(db), day);
  insertProfile(db, a);
  insertProfile(db, b);
  return db;
}
async function saveBase(db, amounts = [850_000, 2_000_000], rev = 0, time = T1, zone = ZONE) {
  return tx(db, (s) =>
    appendFixedTransitionBaseRevision(s, {
      periodKey: PERIOD,
      startDay: DAY,
      scheduleTimeZone: zone,
      declaredBaseMinorUnits: amounts,
      expectedRevision: rev,
      reason: 'Explicit source BASE agreement',
      recordedAt: time,
    }),
  );
}
async function savePolicy(
  db,
  decision = 'include_logged_overtime',
  mode = 'carry_worked_time',
  rev = 0,
  time = T2,
  zone = ZONE,
) {
  return tx(db, (s) =>
    appendTwoFixedOvertimePolicyRevision(s, {
      periodKey: PERIOD,
      startDay: DAY,
      scheduleTimeZone: zone,
      decision,
      thresholdMode: mode,
      expectedRevision: rev,
      reason: 'User explicitly chose overtime treatment',
      recordedAt: time,
    }),
  );
}

test('source-bound policy carries both exact immutable fixed BASE revisions, two rate sources and threshold choice', () => {
  const p = plan();
  const b = base(p);
  const e = policy(p, b);
  assert.equal(e.source, 'user_entered');
  assert.equal(e.schema, 1);
  assert.equal(e.revision, 1);
  assert.equal(e.fixedTransitionBase.segments[0].profile.id, 'old');
  assert.equal(e.fixedTransitionBase.segments[1].profile.id, 'new');
  assert.equal(e.fixedTransitionBase.declaredBaseTotalMinorUnits, 2_850_000);
  assert.equal(e.thresholdMode, 'carry_worked_time');
  assert.equal(twoFixedOvertimePolicyMatches(p, b, e), true);
  assert.equal(e.scheduleTimeZone, ZONE);
});

test('exclude has null threshold; inclusion has explicit carry OR reset; invalid choices fail closed', () => {
  const p = plan();
  const b = base(p);
  assert.equal(policy(p, b, 'exclude_logged_overtime', null).thresholdMode, null);
  assert.equal(
    policy(p, b, 'include_logged_overtime', 'restart_at_transition').thresholdMode,
    'restart_at_transition',
  );
  for (const [decision, mode] of [
    ['exclude_logged_overtime', 'carry_worked_time'],
    ['include_logged_overtime', null],
    ['include_logged_overtime', 'unknown'],
    ['unknown', null],
  ])
    assert.throws(
      () => policy(p, b, decision, mode),
      /INVALID_TWO_FIXED_OT_DECISION|EXCLUDE_MODE_MUST_BE_NULL|THRESHOLD_CHOICE_REQUIRED/,
    );
  assert.throws(
    () =>
      createTwoFixedOvertimePolicyEvent(
        p,
        b,
        'exclude_logged_overtime',
        null,
        0,
        'Valid reason',
        T2,
      ),
    /TWO_FIXED_OT_REVISION_LIMIT/,
  );
  assert.throws(
    () => createTwoFixedOvertimePolicyEvent(p, b, 'exclude_logged_overtime', null, 1, 'x', T2),
    /INVALID_TWO_FIXED_OT_REASON/,
  );
  assert.throws(
    () =>
      createTwoFixedOvertimePolicyEvent(
        p,
        b,
        'exclude_logged_overtime',
        null,
        1,
        'Valid reason',
        '2026-11-16T99:00:00.000Z',
      ),
    /INVALID_TWO_FIXED_OT_TIMESTAMP/,
  );
});

test('missing rates prohibit include but permit explicit exclude; FX and hourly never qualify', () => {
  const p = plan(
    profile('old', '2026-10-01', { overtimeAfterMinutes: null }),
    profile('new', '2026-11-01'),
  );
  const b = base(p);
  assert.throws(() => policy(p, b), /TWO_FIXED_OT_SOURCE_RATE_NOT_CONFIGURED/);
  assert.equal(
    policy(p, b, 'exclude_logged_overtime', null).decision,
    'exclude_logged_overtime',
  );
  const fx = plan(
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01', { currency: 'EUR' }),
  );
  assert.throws(
    () => policy(fx, base(), 'exclude_logged_overtime', null),
    /CURRENCY_NO_FX|STALE_TWO_FIXED_OT_BASE/,
  );
  const mixed = plan(
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01', { model: 'hourly', overtimeHourlyMinorUnits: 0 }),
  );
  assert.throws(
    () => policy(mixed, base(), 'exclude_logged_overtime', null),
    /MODEL_NOT_SUPPORTED/,
  );
});

test('canonical historical head/gap/modified decision or source rejects invalid rows', () => {
  const e = policy();
  const rows = [
    { key: twoFixedOvertimeHeadKey(PERIOD, DAY), value: '1' },
    { key: twoFixedOvertimeEventKey(PERIOD, DAY, 1), value: JSON.stringify(e) },
  ];
  assert.deepEqual(decodeTwoFixedOvertimePolicyHistory(PERIOD, DAY, rows), [e]);
  for (const bad of [
    [{ ...rows[0], value: '2' }, rows[1]],
    [rows[0], { ...rows[1], key: twoFixedOvertimeEventKey(PERIOD, DAY, 2) }],
    [rows[0], { ...rows[1], value: JSON.stringify({ ...e, thresholdMode: 'invalid' }) }],
    [
      rows[0],
      {
        ...rows[1],
        value: JSON.stringify({
          ...e,
          fixedTransitionBase: { ...e.fixedTransitionBase, declaredBaseTotalMinorUnits: 1 },
        }),
      },
    ],
  ])
    assert.throws(
      () => decodeTwoFixedOvertimePolicyHistory(PERIOD, DAY, bad),
      /INVALID_TWO_FIXED_OT_HEAD|TWO_FIXED_OT_EVENT_GAP|INVALID_TWO_FIXED_OT_EVENT/,
    );
});

test('v8 SQLite requires separate BASE, then saves real opt-in policy while combined pay stays BLOCKED', async () => {
  const db = await fixture();
  try {
    assert.equal(
      (await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE)).status,
      'requires_base',
    );
    await assert.rejects(() => savePolicy(db), /TWO_FIXED_OT_CURRENT_BASE_REQUIRED/);
    await saveBase(db);
    const before = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(before.status, 'review');
    assert.equal(before.canInclude, true);
    assert.equal(before.latestDecision, null);
    await savePolicy(db);
    const view = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(view.status, 'review');
    assert.equal(view.latestDecision, 'include_logged_overtime');
    assert.equal(view.latestThresholdMode, 'carry_worked_time');
    assert.equal(view.latestRevision, 1);
    assert.equal(view.baseRevision, 1);
    assert.equal(view.stale, false);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 0);
    const combined = await loadCustomPayCombinedFromStore(store(db), PERIOD, ZONE);
    assert.equal(combined.status, 'blocked');
    assert.ok(combined.reasons.some((reason) => /MIXED_FIXED/.test(reason)));
  } finally {
    db.close();
  }
});

test('revision2 changes threshold or excludes; replay preserves original immutable bytes', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await savePolicy(db);
    const key = twoFixedOvertimeEventKey(PERIOD, DAY, 1);
    const old = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    await assert.rejects(
      () => savePolicy(db, 'include_logged_overtime', 'restart_at_transition', 0, T3),
      /STALE_TWO_FIXED_OT_REVISION/,
    );
    await assert.rejects(
      () => savePolicy(db, 'include_logged_overtime', 'carry_worked_time', 1, T3),
      /UNCHANGED_TWO_FIXED_OT_DECISION/,
    );
    await savePolicy(db, 'include_logged_overtime', 'restart_at_transition', 1, T3);
    const latest = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(latest.latestRevision, 2);
    assert.equal(latest.latestThresholdMode, 'restart_at_transition');
    assert.equal(db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value, old);
    assert.equal((await readTwoFixedOvertimePolicyHistory(store(db), PERIOD, DAY)).length, 2);
  } finally {
    db.close();
  }
});

test('changed BASE amount immediately stales prior consent and requires explicit re-decision', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await savePolicy(db);
    await saveBase(db, [700_000, 2_000_000], 1, T3);
    const view = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(view.stale, true);
    assert.equal(view.latestDecision, null);
    assert.equal(view.latestThresholdMode, null);
    await savePolicy(db, 'exclude_logged_overtime', null, 1, T3);
    const fresh = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(fresh.latestDecision, 'exclude_logged_overtime');
    assert.equal(fresh.stale, false);
    const history = await readTwoFixedOvertimePolicyHistory(store(db), PERIOD, DAY);
    assert.equal(history[0].fixedTransitionBase.revision, 1);
    assert.equal(history[1].fixedTransitionBase.revision, 2);
  } finally {
    db.close();
  }
});

test('profile correction or time zone change stales BASE and blocks new consent until base reapproved', async () => {
  const original = profile('new', '2026-11-01');
  const db = await fixture(profile('old', '2026-10-01'), original);
  try {
    await saveBase(db);
    await savePolicy(db);
    addRevision(db, original, 3_000_000);
    assert.equal(
      (await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE)).status,
      'requires_base',
    );
    await assert.rejects(
      () => savePolicy(db, 'exclude_logged_overtime', null, 1, T3),
      /TWO_FIXED_OT_CURRENT_BASE_REQUIRED/,
    );
    await saveBase(db, [850_000, 2_000_000], 1, T3);
    const view = await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE);
    assert.equal(view.stale, true);
    await savePolicy(db, 'exclude_logged_overtime', null, 1, T3);
    assert.equal(
      (await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, 'Asia/Kathmandu'))
        .status,
      'requires_base',
    );
  } finally {
    db.close();
  }
});

test('simulated head CAS SQL error rolls back inserted next event atomically', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await savePolicy(db);
    const count = (await readTwoFixedOvertimePolicyHistory(store(db), PERIOD, DAY)).length;
    await assert.rejects(
      () =>
        tx(db, async (s) =>
          appendTwoFixedOvertimePolicyRevision(
            {
              ...s,
              async runAsync(sql, ...params) {
                if (sql.startsWith('UPDATE app_settings SET value'))
                  throw new Error('INJECTED_TWO_FIXED_CAS_FAIL');
                return s.runAsync(sql, ...params);
              },
            },
            {
              periodKey: PERIOD,
              startDay: DAY,
              scheduleTimeZone: ZONE,
              decision: 'exclude_logged_overtime',
              thresholdMode: null,
              expectedRevision: 1,
              reason: 'Manual policy correction',
              recordedAt: T3,
            },
          ),
        ),
      /INJECTED_TWO_FIXED_CAS_FAIL/,
    );
    assert.equal(
      (await readTwoFixedOvertimePolicyHistory(store(db), PERIOD, DAY)).length,
      count,
    );
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE ?')
        .get('earnings_custom_two_fixed_overtime_policy_v1:%').n,
      2,
    );
  } finally {
    db.close();
  }
});

test('calendar day1 isolated; year rollover Kathmandu UTC boundary preserves original BASE snapshots', async () => {
  const db = await fixture(profile('old', '2026-10-01'), profile('new', '2026-11-01'), 1);
  try {
    assert.equal(
      (await loadTwoFixedOvertimePolicyReviewFromStore(store(db), PERIOD, ZONE)).status,
      'not_applicable',
    );
    await assert.rejects(() => savePolicy(db), /TWO_FIXED_OT_SETTING_CHANGED/);
  } finally {
    db.close();
  }
  const p = planCustomPayProfiles('2026-12', 26, 'Asia/Kathmandu', [
    profile('dec', '2026-12-01'),
    profile('jan', '2027-01-01'),
  ]);
  const b = createFixedTransitionBaseEvent(p, [1, 2], 1, 'Tiny explicit BASE amounts', T1);
  const e = createTwoFixedOvertimePolicyEvent(
    p,
    b,
    'include_logged_overtime',
    'carry_worked_time',
    1,
    'Explicit year rollover decision',
    T2,
  );
  assert.equal(e.fixedTransitionBase.endDateInclusive, '2027-01-25');
  assert.equal(
    e.fixedTransitionBase.segments[0].endInstantUtc,
    e.fixedTransitionBase.segments[1].startInstantUtc,
  );
  assert.equal(e.thresholdMode, 'carry_worked_time');
});
