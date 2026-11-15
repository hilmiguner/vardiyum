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
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { estimateCustomHourlyWork } from '../src/domain/custom-hourly-work-estimate.ts';
import { loadCustomHourlyEstimateFromStore } from '../src/domain/custom-hourly-work-store.ts';
import { appendCustomPayBreakRevision } from '../src/domain/custom-pay-break-store.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const PERIOD = '2026-10';

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

const oct = profile('oct', '2026-10-01', 10000);
const nov = profile('nov', '2026-11-01', 20000);

function plan(profiles = [oct, nov], key = PERIOD, zone = 'Europe/Istanbul') {
  return planCustomPayProfiles(key, 26, zone, profiles);
}

function work(id, start, end, localDate, endDate, breaks = 0, zone = 'Europe/Istanbul') {
  return {
    id,
    localDate,
    endDate,
    timeZone: zone,
    startInstantUtc: start,
    endInstantUtc: end,
    breakMinutes: breaks,
    source: 'user_entered',
  };
}

const oldWork = work(
  'old',
  '2026-10-30T05:00:00.000Z',
  '2026-10-30T07:00:00.000Z',
  '2026-10-30',
  '2026-10-30',
);
const newWork = work(
  'new',
  '2026-11-10T05:00:00.000Z',
  '2026-11-10T08:00:00.000Z',
  '2026-11-10',
  '2026-11-10',
);
const acrossMidnight = work(
  'rate_boundary',
  '2026-10-31T20:30:00.000Z',
  '2026-10-31T21:30:00.000Z',
  '2026-10-31',
  '2026-11-01',
);

function priced(input, options = {}) {
  return estimateCustomHourlyWork(
    options.plan ?? plan(),
    input.map((value) => ({ work: value })),
    options.adjustments ?? 0,
  );
}

test('two hourly rates use effective calendar days and ONE custom period overtime threshold', () => {
  const report = priced([oldWork, newWork]);
  assert.equal(report.status, 'estimated');
  assert.equal(report.workOnlyMinorUnits, 100000);
  assert.equal(report.profileCount, 2);
  assert.equal(report.profileId, null);
  assert.equal(report.profileRevision, null);
  assert.equal(report.regularSeconds, 3 * 3600);
  assert.equal(report.overtimeSeconds, 2 * 3600);
  assert.deepEqual(
    report.lines.map((line) => [line.workId, line.profileId, line.kind, line.seconds, line.amountMinorUnits]),
    [
      ['old', 'oct', 'regular', 7200, 20000],
      ['new', 'nov', 'regular', 3600, 20000],
      ['new', 'nov', 'overtime', 7200, 60000],
    ],
  );
  assert.equal(report.lines.reduce((sum, line) => sum + line.amountMinorUnits, 0), report.workOnlyMinorUnits);
});

test('break-free work crosses midnight rate boundary in the WORK zone and conserves seconds', () => {
  const report = priced([acrossMidnight], {
    plan: plan([oct, nov].map((item) => ({ ...item, overtimeAfterMinutes: null }))),
  });
  assert.equal(report.status, 'estimated');
  assert.equal(report.workOnlyMinorUnits, 15000);
  assert.equal(report.loggedSeconds, 3600);
  assert.deepEqual(
    report.lines.map((line) => [line.profileId, line.seconds, line.amountMinorUnits]),
    [['oct', 1800, 5000], ['nov', 1800, 10000]],
  );
  assert.equal(report.lines[0].segmentEndUtc, '2026-10-31T21:00:00.000Z');
  assert.equal(report.lines[1].segmentStartUtc, '2026-10-31T21:00:00.000Z');
  assert.equal(report.lines[0].sourceStartUtc, acrossMidnight.startInstantUtc);
});

test('unknown break placement around effective midnight blocks BOTH rates and returns no money', () => {
  const crossingWithBreak = { ...acrossMidnight, breakMinutes: 10 };
  const report = priced([crossingWithBreak]);
  assert.equal(report.status, 'blocked');
  assert.ok(report.reasons.includes('CUSTOM_RATE_BREAK_ALLOCATION_REQUIRED'));
  assert.equal('workOnlyMinorUnits' in report, false);
  assert.equal(priced([oldWork, crossingWithBreak]).status, 'blocked');
});

test('a break wholly within ONE rate interval is safe even if another rate applies elsewhere', () => {
  const withBreak = { ...newWork, breakMinutes: 30 };
  const report = priced([oldWork, withBreak], { plan: plan([
    { ...oct, overtimeAfterMinutes: null },
    { ...nov, overtimeAfterMinutes: null },
  ]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.workOnlyMinorUnits, 70000);
  assert.equal(report.loggedSeconds, 4.5 * 3600);
  assert.equal(report.lines.find((line) => line.workId === 'new').sourceBreakMinutes, 30);
});

test('a rate boundary follows saved Kathmandu work zone, NEVER the displayed Istanbul schedule zone', () => {
  const kathmandu = work(
    'kathmandu',
    '2026-10-31T18:00:00.000Z',
    '2026-10-31T19:00:00.000Z',
    '2026-10-31',
    '2026-11-01',
    0,
    'Asia/Kathmandu',
  );
  const report = priced([kathmandu], { plan: plan([
    { ...oct, overtimeAfterMinutes: null },
    { ...nov, overtimeAfterMinutes: null },
  ]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.loggedSeconds, 3600);
  assert.equal(report.lines[0].segmentEndUtc, '2026-10-31T18:15:00.000Z');
  assert.equal(report.lines[1].segmentStartUtc, '2026-10-31T18:15:00.000Z');
  assert.equal(report.workOnlyMinorUnits, 19167);
  assert.deepEqual(report.lines.map((line) => line.profileId), ['oct', 'nov']);
});

test('New York DST fall-back rate midnight uses actual UTC seconds without local-wall guess', () => {
  const ny = work(
    'ny',
    '2026-11-01T03:30:00.000Z',
    '2026-11-01T04:30:00.000Z',
    '2026-10-31',
    '2026-11-01',
    0,
    'America/New_York',
  );
  const report = priced([ny], { plan: plan([
    { ...oct, overtimeAfterMinutes: null },
    { ...nov, overtimeAfterMinutes: null },
  ]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.lines[0].segmentEndUtc, '2026-11-01T04:00:00.000Z');
  assert.equal(report.workOnlyMinorUnits, 15000);
});

test('a changed threshold is not silently reset at the profile date', () => {
  const report = priced([oldWork, newWork], {
    plan: plan([oct, { ...nov, overtimeAfterMinutes: 240 }]),
  });
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.reasons, ['CUSTOM_MIXED_THRESHOLD_POLICY_REQUIRED']);
});

test('mixed currency or fixed pay blocks, even when rates are otherwise valid', () => {
  const differentCurrency = priced([oldWork], {
    plan: plan([oct, { ...nov, currency: 'USD' }]),
  });
  assert.equal(differentCurrency.status, 'blocked');
  assert.deepEqual(differentCurrency.reasons, ['CUSTOM_MIXED_CURRENCY_POLICY_REQUIRED']);
  const fixed = priced([oldWork, newWork], {
    plan: plan([oct, {
      ...nov,
      model: 'monthly_fixed',
      overtimeAfterMinutes: null,
      overtimeHourlyMinorUnits: 0,
    }]),
  });
  assert.equal(fixed.status, 'blocked');
  assert.equal('workOnlyMinorUnits' in fixed, false);
});

test('effective overtime multiplier may change; rate-specific multiplier applies AFTER shared threshold', () => {
  const modified = { ...nov, overtimeMultiplierNumerator: 2, overtimeMultiplierDenominator: 1 };
  const report = priced([oldWork, newWork], { plan: plan([oct, modified]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.regularSeconds, 3 * 3600);
  assert.equal(report.overtimeSeconds, 2 * 3600);
  assert.equal(report.workOnlyMinorUnits, 120000);
  assert.equal(report.lines.find((line) => line.kind === 'overtime').profileId, 'nov');
});

test('identical numeric rates but distinct effective source IDs remain separate and traceable', () => {
  const report = priced([oldWork, newWork], { plan: plan([
    { ...oct, overtimeAfterMinutes: null },
    { ...nov, baseMinorUnits: 10000, overtimeAfterMinutes: null, revision: 3 },
  ]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.workOnlyMinorUnits, 50000);
  assert.deepEqual(report.lines.map((line) => [line.profileId, line.profileRevision]), [
    ['oct', 1],
    ['nov', 3],
  ]);
});

test('calendar-month adjustments in either touched month block mixed-rate report', () => {
  const report = priced([oldWork], { adjustments: 1 });
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.reasons, ['CUSTOM_PAY_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION']);
});

test('duplicate/overlapping source, malformed UTC and falsified profile plan fail closed', () => {
  assert.equal(priced([oldWork, oldWork]).status, 'blocked');
  const overlap = {
    ...oldWork,
    id: 'overlap',
    startInstantUtc: '2026-10-30T06:00:00.000Z',
    endInstantUtc: '2026-10-30T08:00:00.000Z',
  };
  assert.equal(priced([oldWork, overlap]).status, 'blocked');
  assert.equal(priced([{ ...oldWork, startInstantUtc: 'bad' }]).status, 'blocked');
  const forged = plan();
  const tampered = { ...forged, segments: [{ ...forged.segments[0], endExclusiveDate: '2026-11-02' }, forged.segments[1]] };
  const report = priced([oldWork], { plan: tampered });
  assert.equal(report.status, 'blocked');
  assert.ok(report.reasons.includes('CUSTOM_MIXED_PROFILE_PLAN_CHANGED'));
});

test('tiny per-rate fractional seconds round cumulatively, not once per source line', () => {
  const tiny = [
    work('t1', '2026-10-30T05:00:00.000Z', '2026-10-30T05:00:01.000Z', '2026-10-30', '2026-10-30'),
    work('t2', '2026-10-30T05:00:01.000Z', '2026-10-30T05:00:02.000Z', '2026-10-30', '2026-10-30'),
    work('t3', '2026-10-30T05:00:02.000Z', '2026-10-30T05:00:03.000Z', '2026-10-30', '2026-10-30'),
  ];
  const report = priced(tiny, { plan: plan([
    { ...oct, baseMinorUnits: 1000, overtimeAfterMinutes: null },
    { ...nov, baseMinorUnits: 2000, overtimeAfterMinutes: null },
  ]) });
  assert.equal(report.status, 'estimated');
  assert.equal(report.workOnlyMinorUnits, 1);
  assert.equal(report.lines.reduce((sum, line) => sum + line.amountMinorUnits, 0), 1);
});

function dbV8() {
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
  ]) db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}

function store(db) {
  return {
    async getFirstAsync(sql, ...args) {
      return db.prepare(sql).get(...args) ?? null;
    },
    async getAllAsync(sql, ...args) {
      return db.prepare(sql).all(...args);
    },
    async runAsync(sql, ...args) {
      return db.prepare(sql).run(...args);
    },
  };
}

function insertProfile(db, row) {
  db.prepare(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,revision,source) VALUES (?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    row.id,
    row.effectiveFrom,
    row.model,
    row.currency,
    row.baseMinorUnits,
    row.overtimeHourlyMinorUnits,
    row.overtimeAfterMinutes,
    row.overtimeMultiplierNumerator,
    row.overtimeMultiplierDenominator,
    row.revision,
  );
}

function insertWork(db, row) {
  db.prepare(
    'INSERT INTO actual_work_sessions(id,local_date,start_clock,end_date,end_clock,timezone_id,' +
      'start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    row.id,
    row.localDate,
    '08:00',
    row.endDate,
    '10:00',
    row.timeZone,
    'reject',
    'reject',
    row.startInstantUtc,
    row.endInstantUtc,
    row.breakMinutes,
    'Reported actual work',
  );
}

test('SQLite v1→v8 uses latest two immutable hourly revisions and writes nothing', async () => {
  const db = dbV8();
  try {
    await writePayPeriodStartDay(store(db), 26);
    insertProfile(db, oct);
    insertProfile(db, nov);
    insertWork(db, oldWork);
    insertWork(db, newWork);
    db.prepare(
      'INSERT INTO earnings_profile_revisions(profile_id,revision,effective_from,model,currency,' +
        'base_minor_units,overtime_hourly_minor_units,overtime_after_minutes,' +
        'overtime_multiplier_numerator,overtime_multiplier_denominator,reason,recorded_at,source)' +
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'user_entered')",
    ).run('nov', 2, '2026-11-01', 'hourly', 'TRY', 30000, 0, 180, 3, 2,
      'Corrected source hourly rate', '2026-11-15T18:00:00.000Z');
    const settings = db.prepare('SELECT key,value FROM app_settings ORDER BY key').all().map((row) => ({ ...row }));
    const report = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(report.status, 'estimated');
    assert.equal(report.workOnlyMinorUnits, 150000);
    assert.deepEqual(report.lines.map((line) => [line.profileId, line.profileRevision]), [
      ['oct', 1],
      ['nov', 2],
      ['nov', 2],
    ]);
    assert.deepEqual(
      db.prepare('SELECT key,value FROM app_settings ORDER BY key').all().map((row) => ({ ...row })),
      settings,
    );
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n, 18);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profile_revisions').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});

test('SQLite mixed-rate source crossing 1st with a break blocks; no source revisions are mutated', async () => {
  const db = dbV8();
  try {
    await writePayPeriodStartDay(store(db), 26);
    insertProfile(db, oct);
    insertProfile(db, nov);
    insertWork(db, { ...acrossMidnight, breakMinutes: 10 });
    const report = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(report.status, 'blocked');
    assert.ok(report.reasons.includes('CUSTOM_RATE_BREAK_ALLOCATION_REQUIRED'));
    assert.equal(db.prepare('SELECT break_minutes FROM actual_work_sessions').get().break_minutes, 10);
  } finally { db.close(); }
});
