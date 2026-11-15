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
import { createCustomBreakEvent } from '../src/domain/custom-pay-break-audit.ts';
import {
  appendCustomPayBreakRevision,
  readCustomPayBreakHistory,
} from '../src/domain/custom-pay-break-store.ts';
import {
  createDualBoundaryBreakEvent,
  dualBoundarySource,
  dualBreakEventKey,
  dualBreakHeadKey,
  dualBreakPrefix,
} from '../src/domain/dual-boundary-break-audit.ts';
import {
  appendDualBoundaryBreakRevision,
  readDualBoundaryHistory,
  loadDualBoundaryCandidatesFromStore,
} from '../src/domain/dual-boundary-break-store.ts';
import { loadCustomHourlyEstimateFromStore } from '../src/domain/custom-hourly-work-store.ts';
import { estimateCustomHourlyWork } from '../src/domain/custom-hourly-work-estimate.ts';
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const PREVIOUS = '2026-11';
const FOLLOWING = '2026-12';
const RATE = '2026-12-01';
const WORK_ID = 'dual_shift';
const STAMP_1 = '2026-12-15T16:00:00.000Z';
const STAMP_2 = '2026-12-15T16:01:00.000Z';
const STAMP_3 = '2026-12-15T16:02:00.000Z';

function payProfile(id, effectiveFrom, rate, overrides = {}) {
  return {
    id,
    effectiveFrom,
    model: 'hourly',
    currency: 'TRY',
    baseMinorUnits: rate,
    overtimeHourlyMinorUnits: 0,
    overtimeAfterMinutes: null,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
const oldPay = payProfile('nov', '2026-11-01', 6000);
const newPay = payProfile('dec', '2026-12-01', 12000);
const work = {
  id: WORK_ID,
  localDate: '2026-11-30',
  endDate: '2026-12-02',
  timeZone: 'Europe/Istanbul',
  startInstantUtc: '2026-11-30T20:00:00.000Z',
  endInstantUtc: '2026-12-01T23:00:00.000Z',
  breakMinutes: 90,
  source: 'user_entered',
};

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
function addPay(db, p) {
  db.prepare(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,revision,source) VALUES (?,?,?,?,?,?,?,?,?,?,'user_entered')",
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
function addWork(db, w = work) {
  db.prepare(
    'INSERT INTO actual_work_sessions(id,local_date,start_clock,end_date,end_clock,timezone_id,' +
      'start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    w.id,
    w.localDate,
    '23:00',
    w.endDate,
    '02:00',
    w.timeZone,
    'reject',
    'reject',
    w.startInstantUtc,
    w.endInstantUtc,
    w.breakMinutes,
    'User reported actual work',
  );
}
async function fixture(options = {}) {
  const db = dbV8();
  await writePayPeriodStartDay(store(db), 2);
  addPay(db, oldPay);
  addPay(db, options.secondPay ?? newPay);
  addWork(db);
  return db;
}
function periodInput(firstBreak, revision, recordedAt) {
  return {
    workId: WORK_ID,
    startDay: 2,
    startPeriodBreakMinutes: firstBreak,
    expectedRevision: revision,
    reason: 'Split at custom pay period midnight',
    recordedAt,
  };
}
function dualInput(beforeBreak, revision, recordedAt) {
  return {
    workId: WORK_ID,
    startDay: 2,
    periodKey: PREVIOUS,
    scheduleTimeZone: 'Europe/Istanbul',
    effectiveDate: RATE,
    beforeRateBreakMinutes: beforeBreak,
    expectedRevision: revision,
    reason: 'Break before the new hourly rate',
    recordedAt,
  };
}
async function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const answer = await fn(store(db));
    db.exec('COMMIT');
    return answer;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
async function declarePeriod(db, minutes, revision, stamp) {
  return transaction(db, (adapter) =>
    appendCustomPayBreakRevision(adapter, periodInput(minutes, revision, stamp)),
  );
}
async function declareDual(db, minutes, revision, stamp) {
  return transaction(db, (adapter) =>
    appendDualBoundaryBreakRevision(adapter, dualInput(minutes, revision, stamp)),
  );
}

test('pure dual source: one original crosses rate Dec1 then custom period Dec2, exact UTC & user break source', () => {
  const period = createCustomBreakEvent(
    work,
    2,
    60,
    1,
    'Split at custom pay period midnight',
    STAMP_1,
  );
  const resolved = dualBoundarySource(work, 2, PREVIOUS, RATE, period);
  assert.equal(resolved.rateBoundaryUtc, '2026-11-30T21:00:00.000Z');
  assert.equal(resolved.portion.endInstantUtc, '2026-12-01T21:00:00.000Z');
  assert.equal(resolved.portion.breakMinutes, 60);
  assert.equal(resolved.beforeSeconds, 3600);
  assert.equal(resolved.afterSeconds, 24 * 3600);
  const event = createDualBoundaryBreakEvent(
    work,
    2,
    PREVIOUS,
    RATE,
    period,
    20,
    1,
    'User declared break position',
    STAMP_2,
  );
  assert.equal(event.beforeRateBreakMinutes, 20);
  assert.equal(event.payPeriodAudit.revision, 1);
  assert.equal(event.portionBreakMinutes, 60);
  assert.equal(event.originalBreakMinutes, 90);
  assert.equal(event.portionStartUtc, work.startInstantUtc);
  assert.throws(
    () =>
      createDualBoundaryBreakEvent(
        work,
        2,
        PREVIOUS,
        RATE,
        period,
        61,
        1,
        'User declared break position',
        STAMP_2,
      ),
    /DUAL_BREAK_EXCEEDS_RATE_SEGMENT/,
  );
  assert.throws(
    () =>
      createDualBoundaryBreakEvent(
        work,
        2,
        PREVIOUS,
        RATE,
        period,
        -1,
        1,
        'User declared break position',
        STAMP_2,
      ),
    /DUAL_BREAK_EXCEEDS_RATE_SEGMENT/,
  );
});

test('pay-period break must be declared FIRST; no dual audit can be saved without it', async () => {
  const db = await fixture();
  try {
    const candidates = await loadDualBoundaryCandidatesFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(candidates.candidates.length, 0);
    assert.equal(candidates.pendingPeriodBreakCount, 1);
    await assert.rejects(
      () => declareDual(db, 20, 0, STAMP_2),
      /DUAL_BREAK_PAY_PERIOD_AUDIT_REQUIRED/,
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE 'earnings_dual_boundary_break_v1:%'",
        )
        .get().n,
      0,
    );
  } finally {
    db.close();
  }
});

test('first audit alone blocks mixed wage but next pay period can price its own source portion', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    const candidates = await loadDualBoundaryCandidatesFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(candidates.candidates.length, 1);
    assert.equal(candidates.candidates[0].portionBreakMinutes, 60);
    assert.equal(candidates.candidates[0].maxBeforeMinutes, 60);
    assert.equal(candidates.candidates[0].maxAfterMinutes, 1440);
    assert.equal(candidates.candidates[0].chosenBeforeMinutes, null);
    const first = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    const second = await loadCustomHourlyEstimateFromStore(
      store(db),
      FOLLOWING,
      'Europe/Istanbul',
    );
    assert.equal(first.status, 'blocked');
    assert.ok(first.reasons.includes('DUAL_BOUNDARY_BREAK_ALLOCATION_REQUIRED'));
    assert.equal(second.status, 'estimated');
    assert.equal(second.loggedSeconds, 90 * 60);
    assert.equal(second.workOnlyMinorUnits, 18000);
  } finally {
    db.close();
  }
});

test('two audited declarations price three disjoint UTC portions exactly without double-counting', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    const declared = await declareDual(db, 20, 0, STAMP_2);
    assert.equal(declared.revision, 1);
    assert.equal(declared.payPeriodAudit.revision, 1);
    const first = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    const next = await loadCustomHourlyEstimateFromStore(
      store(db),
      FOLLOWING,
      'Europe/Istanbul',
    );
    assert.equal(first.status, 'estimated');
    assert.equal(next.status, 'estimated');
    assert.equal(first.loggedSeconds, 24 * 3600);
    assert.equal(next.loggedSeconds, 90 * 60);
    assert.equal(first.loggedSeconds + next.loggedSeconds, (27 * 60 - 90) * 60);
    assert.equal(first.workOnlyMinorUnits, 284000);
    assert.equal(next.workOnlyMinorUnits, 18000);
    assert.equal(first.workOnlyMinorUnits + next.workOnlyMinorUnits, 302000);
    assert.deepEqual(
      first.lines.map((row) => [
        row.profileId,
        row.seconds,
        row.sourceBreakMinutes,
        row.breakAuditRevision,
        row.rateBreakAuditRevision,
        row.rateBreakAuditKind,
      ]),
      [
        ['nov', 40 * 60, 20, 1, 1, 'dual'],
        ['dec', 23 * 3600 + 20 * 60, 40, 1, 1, 'dual'],
      ],
    );
    assert.equal(first.lines[0].segmentEndUtc, first.lines[1].segmentStartUtc);
    assert.equal(first.lines[1].segmentEndUtc, next.lines[0].segmentStartUtc);
    assert.equal(first.lines[0].sourceStartUtc, work.startInstantUtc);
    assert.equal(first.lines[0].sourceEndUtc, work.endInstantUtc);
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

test('when first pay break audit is corrected, a previous dual audit fails closed until re-bound', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    const a = await declareDual(db, 20, 0, STAMP_2);
    const oldJson = db
      .prepare('SELECT value FROM app_settings WHERE key=?')
      .get(dualBreakEventKey(WORK_ID, 2, PREVIOUS, 1)).value;
    await declarePeriod(db, 70, 1, STAMP_3);
    const stale = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(stale.status, 'blocked');
    assert.ok(stale.reasons.includes('STALE_DUAL_PAY_PERIOD_AUDIT'));
    const candidates = await loadDualBoundaryCandidatesFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(candidates.candidates.length, 1);
    assert.equal(candidates.candidates[0].stale, true);
    assert.equal(candidates.candidates[0].payPeriodAuditRevision, 2);
    const fresh = await declareDual(db, 20, 1, '2026-12-15T16:03:00.000Z');
    assert.equal(fresh.revision, 2);
    assert.equal(fresh.payPeriodAudit.revision, 2);
    assert.equal(JSON.stringify(a), oldJson);
    assert.equal(
      db
        .prepare('SELECT value FROM app_settings WHERE key=?')
        .get(dualBreakEventKey(WORK_ID, 2, PREVIOUS, 1)).value,
      oldJson,
    );
    const after = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    const next = await loadCustomHourlyEstimateFromStore(
      store(db),
      FOLLOWING,
      'Europe/Istanbul',
    );
    assert.equal(after.status, 'estimated');
    assert.equal(next.status, 'estimated');
    assert.equal(after.workOnlyMinorUnits, 282000);
    assert.equal(next.workOnlyMinorUnits, 20000);
    assert.equal(after.workOnlyMinorUnits + next.workOnlyMinorUnits, 302000);
    assert.deepEqual(
      after.lines.map((row) => [row.breakAuditRevision, row.rateBreakAuditRevision]),
      [
        [2, 2],
        [2, 2],
      ],
    );
  } finally {
    db.close();
  }
});

test('stale dual UI revision, unchanged values and invalid reason/timestamp do not write any new event', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    await declareDual(db, 20, 0, STAMP_2);
    const wrong = [
      dualInput(30, 0, STAMP_3),
      dualInput(20, 1, STAMP_3),
      { ...dualInput(30, 1, STAMP_3), reason: 'a' },
      { ...dualInput(30, 1, STAMP_3), recordedAt: 'not a timestamp' },
      { ...dualInput(30, 1, STAMP_3), effectiveDate: '2026-11-01' },
      { ...dualInput(30, 1, STAMP_3), startDay: 3 },
    ];
    for (const attempt of wrong) {
      db.exec('BEGIN IMMEDIATE');
      try {
        await assert.rejects(() => appendDualBoundaryBreakRevision(store(db), attempt));
      } finally {
        db.exec('ROLLBACK');
      }
    }
    const history = await readDualBoundaryHistory(store(db), work, 2, PREVIOUS, RATE);
    assert.equal(history.length, 1);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE 'earnings_dual_boundary_break_v1:%'",
        )
        .get().n,
      2,
    );
  } finally {
    db.close();
  }
});

test('corrupt source snapshot and missing head are rejected at every read; no valid financial report leaks', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    await declareDual(db, 20, 0, STAMP_2);
    const key = dualBreakEventKey(WORK_ID, 2, PREVIOUS, 1);
    const original = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(
      original.replace('"originalBreakMinutes":90', '"originalBreakMinutes":91'),
      key,
    );
    await assert.rejects(
      () => readDualBoundaryHistory(store(db), work, 2, PREVIOUS, RATE),
      /INVALID_DUAL_BREAK_EVENT/,
    );
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(original, key);
    db.prepare('DELETE FROM app_settings WHERE key=?').run(
      dualBreakHeadKey(WORK_ID, 2, PREVIOUS),
    );
    await assert.rejects(
      () => readDualBoundaryHistory(store(db), work, 2, PREVIOUS, RATE),
      /INVALID_DUAL_BREAK_HEAD/,
    );
    const mutated = { ...work, endInstantUtc: '2026-12-02T00:00:00.000Z' };
    await assert.rejects(() => readDualBoundaryHistory(store(db), mutated, 2, PREVIOUS, RATE));
  } finally {
    db.close();
  }
});

test('simulated interrupted write between dual event and head rolls back atomically', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    db.exec('BEGIN IMMEDIATE');
    try {
      const adapter = {
        ...store(db),
        async runAsync(sql, ...params) {
          if (sql.startsWith('INSERT INTO app_settings') && params[0].endsWith(':head'))
            throw new Error('SIMULATED_STORAGE_FAULT');
          return db.prepare(sql).run(...params);
        },
      };
      await assert.rejects(
        () => appendDualBoundaryBreakRevision(adapter, dualInput(20, 0, STAMP_2)),
        /SIMULATED_STORAGE_FAULT/,
      );
    } finally {
      db.exec('ROLLBACK');
    }
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM app_settings WHERE key LIKE 'earnings_dual_boundary_break_v1:%'",
        )
        .get().n,
      0,
    );
    const blocked = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(blocked.status, 'blocked');
  } finally {
    db.close();
  }
});

test('literal underscore IDs cannot select another work stream; separate period keys stay distinct', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    await declareDual(db, 20, 0, STAMP_2);
    assert.ok(
      dualBreakPrefix('dual_shift', 2, PREVIOUS) !== dualBreakPrefix('dualXshift', 2, PREVIOUS),
    );
    assert.ok(dualBreakPrefix(WORK_ID, 3, PREVIOUS) !== dualBreakPrefix(WORK_ID, 2, PREVIOUS));
    assert.ok(dualBreakPrefix(WORK_ID, 2, FOLLOWING) !== dualBreakPrefix(WORK_ID, 2, PREVIOUS));
    db.prepare('INSERT INTO app_settings(key,value) VALUES (?,?)').run(
      dualBreakPrefix('dualXshift', 2, PREVIOUS) + 'head',
      '999',
    );
    const records = await readDualBoundaryHistory(store(db), work, 2, PREVIOUS, RATE);
    assert.equal(records.length, 1);
  } finally {
    db.close();
  }
});

test('falsified in-memory dual event, changed pay audit revision and missing current period allocation fail closed', () => {
  const period = createCustomBreakEvent(
    work,
    2,
    60,
    1,
    'Split at custom pay period midnight',
    STAMP_1,
  );
  const dual = createDualBoundaryBreakEvent(
    work,
    2,
    PREVIOUS,
    RATE,
    period,
    20,
    1,
    'Break before the new hourly rate',
    STAMP_2,
  );
  const plan = planCustomPayProfiles(PREVIOUS, 2, 'Europe/Istanbul', [oldPay, newPay]);
  for (const [caseIndex, entry] of [
    {
      work,
      allocation: period,
      auditRevision: 1,
      dualBreakAudit: { ...dual, originalBreakMinutes: 91 },
    },
    { work, allocation: period, auditRevision: 2, dualBreakAudit: dual },
    {
      work,
      allocation: period,
      auditRevision: 1,
      dualBreakAudit: { ...dual, portionBreakMinutes: 61 },
    },
    { work, dualBreakAudit: dual },
  ].entries()) {
    const estimate = estimateCustomHourlyWork(plan, [entry], 0);
    assert.equal(estimate.status, 'blocked', 'invalid case ' + caseIndex);
    assert.equal('workOnlyMinorUnits' in estimate, false);
  }
});

test('Kathmandu source UTC+5:45 and DST-safe civil midnight, never schedule-zone millis', () => {
  const source = {
    ...work,
    id: 'ktm_cross',
    timeZone: 'Asia/Kathmandu',
    localDate: '2026-11-30',
    endDate: '2026-12-02',
    startInstantUtc: '2026-11-30T17:15:00.000Z',
    endInstantUtc: '2026-12-01T20:15:00.000Z',
  };
  const period = createCustomBreakEvent(
    source,
    2,
    60,
    1,
    'Split at custom pay period midnight',
    STAMP_1,
  );
  const resolved = dualBoundarySource(source, 2, PREVIOUS, RATE, period);
  assert.equal(resolved.rateBoundaryUtc, '2026-11-30T18:15:00.000Z');
  const dual = createDualBoundaryBreakEvent(
    source,
    2,
    PREVIOUS,
    RATE,
    period,
    20,
    1,
    'Break before Kathmandu midnight',
    STAMP_2,
  );
  assert.equal(dual.timeZone, 'Asia/Kathmandu');
  assert.equal(dual.rateBoundaryUtc, '2026-11-30T18:15:00.000Z');
});

test('mixed currencies are not eligible for manual dual break pricing', async () => {
  const db = await fixture({ secondPay: { ...newPay, currency: 'USD' } });
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    await assert.rejects(
      () => declareDual(db, 20, 0, STAMP_2),
      /DUAL_BREAK_UNSUPPORTED_PROFILE_POLICY/,
    );
    const candidates = await loadDualBoundaryCandidatesFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(candidates.candidates.length, 0);
    const estimate = await loadCustomHourlyEstimateFromStore(
      store(db),
      PREVIOUS,
      'Europe/Istanbul',
    );
    assert.equal(estimate.status, 'blocked');
  } finally {
    db.close();
  }
});

test('legacy v8 session and monthly audit tables remain unchanged and day1 routes to old monthly reporting', async () => {
  const db = await fixture();
  try {
    await declarePeriod(db, 60, 0, STAMP_1);
    await declareDual(db, 20, 0, STAMP_2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 1);
    assert.equal(
      db.prepare('SELECT break_minutes FROM actual_work_sessions').get().break_minutes,
      90,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n,
      0,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 0);
    const dayOnePlan = planCustomPayProfiles('2026-12', 1, 'Europe/Istanbul', [oldPay, newPay]);
    assert.equal(estimateCustomHourlyWork(dayOnePlan, [{ work }], 0).status, 'disabled');
  } finally {
    db.close();
  }
});
