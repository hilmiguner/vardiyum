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
import {
  appendCustomFixedBaseRevision,
  readCustomFixedBaseHistory,
} from '../src/domain/custom-fixed-base-store.ts';
import {
  appendFixedOvertimeRevision,
  readFixedOvertimeHistory,
  loadFixedOvertimeViewFromStore,
} from '../src/domain/custom-fixed-overtime-store.ts';
import { estimateCustomFixedOvertime } from '../src/domain/custom-fixed-overtime-engine.ts';
import {
  createFixedOvertimeEvent,
  fixedOvertimeEventKey,
  fixedOvertimeHeadKey,
  fixedOvertimePrefix,
} from '../src/domain/custom-fixed-overtime-policy.ts';
import { appendCustomPayBreakRevision } from '../src/domain/custom-pay-break-store.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const P = '2026-10';
const NEXT = '2026-11';
const DAY = 26;
const ZONE = 'Europe/Istanbul';
const STAMP1 = '2026-11-16T08:00:00.000Z';
const STAMP2 = '2026-11-16T08:01:00.000Z';
const STAMP3 = '2026-11-16T08:02:00.000Z';
const FIRST_WORK = {
  id: 'work_cross',
  localDate: '2026-11-25',
  endDate: '2026-11-26',
  timeZone: ZONE,
  startInstantUtc: '2026-11-25T20:00:00.000Z',
  endInstantUtc: '2026-11-26T04:00:00.000Z',
  breakMinutes: 30,
  source: 'user_entered',
};
function profile(overrides = {}) {
  return {
    id: 'fixed_oct',
    effectiveFrom: '2026-10-01',
    model: 'monthly_fixed',
    currency: 'TRY',
    baseMinorUnits: 2_750_099,
    overtimeHourlyMinorUnits: 20_000,
    overtimeAfterMinutes: 60,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
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
function addProfile(db, p = profile()) {
  db.prepare(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,revision,source) VALUES(?,?,?,?,?,?,?,?,?,?,'user_entered')",
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
function addRevision(db, initial, revision, update = {}) {
  const p = { ...initial, ...update, revision };
  db.prepare(
    'INSERT INTO earnings_profile_revisions(' +
      'profile_id,revision,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,reason,recorded_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    p.id,
    p.revision,
    p.effectiveFrom,
    p.model,
    p.currency,
    p.baseMinorUnits,
    p.overtimeHourlyMinorUnits,
    p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,
    p.overtimeMultiplierDenominator,
    'User explicitly corrected overtime rate',
    STAMP2,
  );
}
function addWork(db, w = FIRST_WORK) {
  db.prepare(
    'INSERT INTO actual_work_sessions(' +
      'id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,' +
      'start_instant_utc,end_instant_utc,break_minutes,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    w.id,
    w.localDate,
    '23:00',
    w.endDate,
    '07:00',
    w.timeZone,
    'reject',
    'reject',
    w.startInstantUtc,
    w.endInstantUtc,
    w.breakMinutes,
    'User reported actual work',
  );
}
async function fixture(p = profile()) {
  const db = dbV8();
  await writePayPeriodStartDay(store(db), DAY);
  addProfile(db, p);
  return db;
}
async function transact(db, call, adapter = store(db)) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const v = await call(adapter);
    db.exec('COMMIT');
    return v;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
async function saveBase(
  db,
  period = P,
  expected = 0,
  choice = 'full_base',
  amount = null,
  stamp = STAMP1,
) {
  return transact(db, (s) =>
    appendCustomFixedBaseRevision(s, {
      periodKey: period,
      startDay: DAY,
      scheduleTimeZone: ZONE,
      choice,
      partialBaseMinorUnits: amount,
      expectedRevision: expected,
      reason: 'I selected my fixed base myself',
      recordedAt: stamp,
    }),
  );
}
async function saveConsent(
  db,
  decision = 'include_logged_overtime',
  expected = 0,
  stamp = STAMP2,
  opts = {},
) {
  return transact(db, (s) =>
    appendFixedOvertimeRevision(s, {
      periodKey: P,
      startDay: DAY,
      scheduleTimeZone: ZONE,
      decision,
      expectedRevision: expected,
      reason: 'I chose the logged overtime policy',
      recordedAt: stamp,
      ...opts,
    }),
  );
}
async function declareBreak(db, minutes = 10) {
  return transact(db, (s) =>
    appendCustomPayBreakRevision(s, {
      workId: FIRST_WORK.id,
      startDay: DAY,
      startPeriodBreakMinutes: minutes,
      expectedRevision: 0,
      reason: 'Explicit custom period break distribution',
      recordedAt: STAMP1,
    }),
  );
}
function countConsent(db) {
  const prefix = fixedOvertimePrefix(P, DAY);
  return db
    .prepare('SELECT COUNT(*) AS n FROM app_settings WHERE substr(key,1,?)=?')
    .get(prefix.length, prefix).n;
}

test('without fixed BASE consent there is no overtime policy or combined amount', async () => {
  const db = await fixture();
  try {
    const report = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(report.status, 'requires_base');
    assert.equal('estimate' in report, false);
    await assert.rejects(() => saveConsent(db), /FIXED_OVERTIME_BASE_CHOICE_REQUIRED/);
    assert.equal(countConsent(db), 0);
  } finally {
    db.close();
  }
});

test('fixed profile requires explicitly configured threshold and hourly overtime rate', async () => {
  for (const extra of [
    { overtimeAfterMinutes: null, overtimeHourlyMinorUnits: 0 },
    { overtimeAfterMinutes: null, overtimeHourlyMinorUnits: 20_000 },
  ]) {
    const db = await fixture(profile(extra));
    try {
      await saveBase(db);
      const report = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
      assert.equal(report.status, 'needs_configuration');
      assert.equal('estimate' in report, false);
      await assert.rejects(
        () => saveConsent(db),
        /CUSTOM_FIXED_OVERTIME_PROFILE_NOT_CONFIGURED/,
      );
    } finally {
      db.close();
    }
  }
});

test('a base declaration alone is not permission to add overtime', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    addWork(db);
    await declareBreak(db);
    const view = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(view.status, 'review');
    assert.equal(view.estimate.status, 'needs_consent');
    assert.equal('combinedMinorUnits' in view.estimate, false);
    assert.equal(view.baseMinorUnits, 2_750_099);
    assert.equal(view.thresholdMinutes, 60);
  } finally {
    db.close();
  }
});

test('explicit exclude choice persists and never produces a combined amount', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    addWork(db);
    const event = await saveConsent(db, 'exclude_logged_overtime');
    assert.equal(event.revision, 1);
    assert.equal(event.decision, 'exclude_logged_overtime');
    const report = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(report.status, 'review');
    assert.equal(report.estimate.status, 'excluded');
    assert.equal('combinedMinorUnits' in report.estimate, false);
    assert.equal(report.latestRevision, 1);
    assert.equal(
      db.prepare('SELECT break_minutes FROM actual_work_sessions').get().break_minutes,
      30,
    );
  } finally {
    db.close();
  }
});

test('explicit include WITHOUT break attribution blocks whole combined amount', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    addWork(db);
    const view = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(view.status, 'review');
    assert.equal(view.estimate.status, 'blocked');
    assert.ok(
      view.estimate.reasons.some((r) => r.includes('PAY_PERIOD_BREAK_ALLOCATION_REQUIRED')),
    );
    assert.equal('combinedMinorUnits' in view.estimate, false);
  } finally {
    db.close();
  }
});

test('audited work splits at 26th midnight; only seconds beyond threshold earn overtime', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    addWork(db);
    await declareBreak(db, 10);
    const first = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(first.status, 'review');
    assert.equal(first.estimate.status, 'estimated');
    assert.equal(first.estimate.loggedSeconds, 50 * 60);
    assert.equal(first.estimate.regularSeconds, 50 * 60);
    assert.equal(first.estimate.overtimeSeconds, 0);
    assert.equal(first.estimate.overtimeMinorUnits, 0);
    assert.equal(first.estimate.combinedMinorUnits, 2_750_099);
    assert.equal(first.estimate.lines[0].breakAuditRevision, 1);
    await saveBase(db, NEXT, 0);
    const nextDecision = await transact(db, (s) =>
      appendFixedOvertimeRevision(s, {
        periodKey: NEXT,
        startDay: DAY,
        scheduleTimeZone: ZONE,
        decision: 'include_logged_overtime',
        expectedRevision: 0,
        reason: 'I explicitly authorize next payroll overtime',
        recordedAt: STAMP2,
      }),
    );
    assert.equal(nextDecision.periodKey, NEXT);
    const next = await loadFixedOvertimeViewFromStore(store(db), NEXT, ZONE);
    assert.equal(next.status, 'review');
    assert.equal(next.estimate.status, 'estimated');
    assert.equal(next.estimate.loggedSeconds, 6 * 3600 + 40 * 60);
    assert.equal(next.estimate.regularSeconds, 3600);
    assert.equal(next.estimate.overtimeSeconds, 5 * 3600 + 40 * 60);
    assert.equal(next.estimate.overtimeMinorUnits, 170_000);
    assert.equal(next.estimate.combinedMinorUnits, 2_920_099);
    assert.equal(first.estimate.loggedSeconds + next.estimate.loggedSeconds, 7.5 * 3600);
    assert.equal(first.estimate.lines[0].segmentEndUtc, next.estimate.lines[0].segmentStartUtc);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 0);
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

test('base revision correction invalidates old overtime consent until new opt-in', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    const old = await saveConsent(db);
    const bytes = db
      .prepare('SELECT value FROM app_settings WHERE key=?')
      .get(fixedOvertimeEventKey(P, DAY, 1)).value;
    await saveBase(db, P, 1, 'explicit_partial_base', 1_234_500, STAMP2);
    const stale = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(stale.status, 'review');
    assert.equal(stale.stale, true);
    assert.equal(stale.estimate.status, 'stale_consent');
    assert.equal('combinedMinorUnits' in stale.estimate, false);
    const updated = await saveConsent(db, 'include_logged_overtime', 1, STAMP3);
    assert.equal(updated.revision, 2);
    assert.equal(updated.fixedBase.revision, 2);
    const history = await readFixedOvertimeHistory(store(db), P, DAY);
    assert.deepEqual(
      history.map((x) => x.fixedBase.revision),
      [1, 2],
    );
    assert.equal(
      db
        .prepare('SELECT value FROM app_settings WHERE key=?')
        .get(fixedOvertimeEventKey(P, DAY, 1)).value,
      bytes,
    );
    assert.equal(JSON.stringify(old), bytes);
    const after = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(after.estimate.status, 'estimated');
    assert.equal(after.estimate.combinedMinorUnits, 1_234_500);
  } finally {
    db.close();
  }
});

test('pay profile corrected at source requires new base then new overtime approval', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    addRevision(db, profile(), 2, { overtimeAfterMinutes: 90 });
    const first = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(first.status, 'requires_base');
    await saveBase(db, P, 1, 'full_base', null, STAMP3);
    const second = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(second.status, 'review');
    assert.equal(second.stale, true);
    assert.equal(second.estimate.status, 'blocked');
    assert.equal('combinedMinorUnits' in second.estimate, false);
    const renewed = await saveConsent(
      db,
      'include_logged_overtime',
      1,
      '2026-11-16T08:03:00.000Z',
    );
    assert.equal(renewed.fixedBase.profile.revision, 2);
    assert.equal(
      (await loadFixedOvertimeViewFromStore(store(db), P, ZONE)).estimate.status,
      'estimated',
    );
  } finally {
    db.close();
  }
});

test('exact cumulative cents avoids per-source rounding inflation', () => {
  const p = planCustomPayProfiles(P, DAY, ZONE, [
    profile({
      baseMinorUnits: 100000,
      overtimeAfterMinutes: 0,
      overtimeHourlyMinorUnits: 1000,
    }),
  ]);
  const base = {
    schema: 1,
    source: 'user_entered',
    periodKey: P,
    startDay: DAY,
    startDate: p.startDate,
    endDateInclusive: p.endDateInclusive,
    scheduleTimeZone: ZONE,
    profile: p.segments[0].profile,
    choice: 'full_base',
    chosenBaseMinorUnits: 100000,
    revision: 1,
    reason: 'Explicit full base choice',
    recordedAt: STAMP1,
  };
  const consent = createFixedOvertimeEvent(
    p,
    base,
    'include_logged_overtime',
    1,
    'Explicit overtime opt in',
    STAMP2,
  );
  const works = [0, 1, 2].map((i) => ({
    work: {
      id: 'tiny_' + i,
      localDate: '2026-11-10',
      endDate: '2026-11-10',
      timeZone: ZONE,
      startInstantUtc: new Date(
        Date.parse('2026-11-10T05:00:00.000Z') + i * 1000,
      ).toISOString(),
      endInstantUtc: new Date(
        Date.parse('2026-11-10T05:00:00.000Z') + (i + 1) * 1000,
      ).toISOString(),
      breakMinutes: 0,
      source: 'user_entered',
    },
  }));
  const result = estimateCustomFixedOvertime(p, base, consent, works, 0);
  assert.equal(result.status, 'estimated');
  assert.equal(result.overtimeSeconds, 3);
  assert.equal(result.overtimeMinorUnits, 1);
  assert.equal(result.combinedMinorUnits, 100001);
  assert.equal(
    result.lines.reduce((n, line) => n + line.overtimeMinorUnits, 0),
    1,
  );
});

test('duplicate or overlapping work blocks all combined money', () => {
  const p = planCustomPayProfiles(P, DAY, ZONE, [profile()]);
  const base = {
    schema: 1,
    source: 'user_entered',
    periodKey: P,
    startDay: DAY,
    startDate: p.startDate,
    endDateInclusive: p.endDateInclusive,
    scheduleTimeZone: ZONE,
    profile: p.segments[0].profile,
    choice: 'full_base',
    chosenBaseMinorUnits: 2_750_099,
    revision: 1,
    reason: 'Explicit full base choice',
    recordedAt: STAMP1,
  };
  const consent = createFixedOvertimeEvent(
    p,
    base,
    'include_logged_overtime',
    1,
    'Explicit overtime opt in',
    STAMP2,
  );
  const w = {
    ...FIRST_WORK,
    id: 'inside',
    localDate: '2026-11-10',
    endDate: '2026-11-10',
    startInstantUtc: '2026-11-10T05:00:00.000Z',
    endInstantUtc: '2026-11-10T06:00:00.000Z',
    breakMinutes: 0,
  };
  const copy = {
    ...w,
    id: 'overlap',
    startInstantUtc: '2026-11-10T05:30:00.000Z',
    endInstantUtc: '2026-11-10T06:30:00.000Z',
  };
  for (const sources of [
    [{ work: w }, { work: w }],
    [{ work: w }, { work: copy }],
  ]) {
    const estimate = estimateCustomFixedOvertime(p, base, consent, sources, 0);
    assert.equal(estimate.status, 'blocked');
    assert.equal('combinedMinorUnits' in estimate, false);
  }
});

test('calendar adjustments in overlapping months block even saved consent', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    for (const kind of ['bonus', 'deduction', 'correction']) {
      db.prepare(
        'INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,note,created_at) VALUES(?,?,?,?,?,?,?)',
      ).run(
        'adj_' + kind,
        '2026-11',
        kind,
        'TRY',
        kind === 'deduction' ? -100 : 100,
        'Calendar month adjustment',
        STAMP3,
      );
    }
    const report = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(report.status, 'blocked');
    assert.equal('estimate' in report, false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 3);
  } finally {
    db.close();
  }
});

test('stale UI, unchanged decision, invalid reason and source mismatch all rollback', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    for (const attempt of [
      { expectedRevision: 0, decision: 'exclude_logged_overtime' },
      { expectedRevision: 1, decision: 'include_logged_overtime' },
      { expectedRevision: 1, decision: 'exclude_logged_overtime', reason: 'x' },
      { expectedRevision: 1, decision: 'exclude_logged_overtime', recordedAt: 'invalid' },
      { expectedRevision: 1, decision: 'exclude_logged_overtime', startDay: 25 },
      { expectedRevision: 1, decision: 'some_other_option' },
    ]) {
      db.exec('BEGIN IMMEDIATE');
      try {
        await assert.rejects(() =>
          appendFixedOvertimeRevision(store(db), {
            periodKey: P,
            startDay: DAY,
            scheduleTimeZone: ZONE,
            decision: 'include_logged_overtime',
            expectedRevision: 1,
            reason: 'Explicit overtime policy review',
            recordedAt: STAMP3,
            ...attempt,
          }),
        );
      } finally {
        db.exec('ROLLBACK');
      }
    }
    assert.equal((await readFixedOvertimeHistory(store(db), P, DAY)).length, 1);
    assert.equal(countConsent(db), 2);
  } finally {
    db.close();
  }
});

test('corrupt embedded fixed source and missing head are fail closed', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    const key = fixedOvertimeEventKey(P, DAY, 1);
    const original = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(
      original.replace('"chosenBaseMinorUnits":2750099', '"chosenBaseMinorUnits":123'),
      key,
    );
    await assert.rejects(
      () => readFixedOvertimeHistory(store(db), P, DAY),
      /INVALID_FIXED_OVERTIME_EVENT/,
    );
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(original, key);
    db.prepare('DELETE FROM app_settings WHERE key=?').run(fixedOvertimeHeadKey(P, DAY));
    await assert.rejects(
      () => readFixedOvertimeHistory(store(db), P, DAY),
      /INVALID_FIXED_OVERTIME_HEAD/,
    );
  } finally {
    db.close();
  }
});

test('interrupted INSERT/head update leaves no partial user consent', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    const adapter = {
      ...store(db),
      async runAsync(sql, ...params) {
        if (sql.startsWith('INSERT INTO app_settings') && params[0].endsWith(':head'))
          throw new Error('SIMULATED_POWER_LOSS');
        return db.prepare(sql).run(...params);
      },
    };
    await assert.rejects(
      () =>
        transact(
          db,
          (s) =>
            appendFixedOvertimeRevision(s, {
              periodKey: P,
              startDay: DAY,
              scheduleTimeZone: ZONE,
              decision: 'include_logged_overtime',
              expectedRevision: 0,
              reason: 'Explicit approval',
              recordedAt: STAMP2,
            }),
          adapter,
        ),
      /SIMULATED_POWER_LOSS/,
    );
    assert.equal(countConsent(db), 0);
    const report = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(report.estimate.status, 'needs_consent');
  } finally {
    db.close();
  }
});

test('day1, hourly model, mixed fixed profile and missing opening profile never price overtime', async () => {
  const db = await fixture();
  try {
    await writePayPeriodStartDay(store(db), 1);
    assert.equal(
      (await loadFixedOvertimeViewFromStore(store(db), P, ZONE)).status,
      'not_applicable',
    );
    await assert.rejects(() => saveConsent(db), /FIXED_OVERTIME_SETTING_CHANGED/);
  } finally {
    db.close();
  }
  const dbHourly = await fixture(profile({ model: 'hourly', overtimeHourlyMinorUnits: 0 }));
  try {
    assert.equal(
      (await loadFixedOvertimeViewFromStore(store(dbHourly), P, ZONE)).status,
      'not_applicable',
    );
  } finally {
    dbHourly.close();
  }
  const dbMixed = await fixture();
  try {
    addProfile(
      dbMixed,
      profile({
        id: 'next_fixed',
        effectiveFrom: '2026-11-01',
        baseMinorUnits: 3_000_000,
      }),
    );
    assert.equal(
      (await loadFixedOvertimeViewFromStore(store(dbMixed), P, ZONE)).status,
      'blocked',
    );
  } finally {
    dbMixed.close();
  }
});

test('source IANA offset and ordinary UTC boundaries never use phone time zone', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    addWork(db, {
      id: 'ktm',
      localDate: '2026-11-10',
      endDate: '2026-11-10',
      timeZone: 'Asia/Kathmandu',
      startInstantUtc: '2026-11-10T00:15:00.000Z',
      endInstantUtc: '2026-11-10T02:15:00.000Z',
      breakMinutes: 0,
      source: 'user_entered',
    });
    const view = await loadFixedOvertimeViewFromStore(store(db), P, ZONE);
    assert.equal(view.estimate.status, 'estimated');
    assert.equal(view.estimate.lines[0].timeZone, 'Asia/Kathmandu');
    assert.equal(view.estimate.loggedSeconds, 7200);
    assert.equal(view.estimate.overtimeSeconds, 3600);
    assert.equal(view.estimate.overtimeMinorUnits, 30000);
  } finally {
    db.close();
  }
});

test('period and literal key namespaces isolate user decisions and old earnings tables', async () => {
  const db = await fixture();
  try {
    await saveBase(db);
    await saveConsent(db);
    const prefix = fixedOvertimePrefix(P, DAY);
    assert.notEqual(prefix, fixedOvertimePrefix(NEXT, DAY));
    assert.notEqual(prefix, fixedOvertimePrefix(P, 25));
    db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run(
      'earnings_custom_fixed_overtime_v1:2X:2026-10:head',
      '999',
    );
    assert.equal((await readFixedOvertimeHistory(store(db), P, DAY)).length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 0);
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
