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

const DAY = 26;
const PERIOD = '2026-10';
const SOURCE_ID = 'cross_25_26';

function profile(overrides = {}) {
  return {
    id: 'p_oct',
    effectiveFrom: '2026-10-01',
    model: 'hourly',
    currency: 'TRY',
    baseMinorUnits: 10000,
    overtimeHourlyMinorUnits: 0,
    overtimeAfterMinutes: null,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}

function work(id, start, end, localDate, endDate, breakMinutes = 0) {
  return {
    id,
    localDate,
    endDate,
    timeZone: 'Europe/Istanbul',
    startInstantUtc: start,
    endInstantUtc: end,
    breakMinutes,
    source: 'user_entered',
  };
}

const crossing = work(
  SOURCE_ID,
  '2026-11-25T20:00:00.000Z',
  '2026-11-26T04:00:00.000Z',
  '2026-11-25',
  '2026-11-26',
  30,
);

function policy(period = PERIOD, overrides = {}) {
  return planCustomPayProfiles(period, DAY, 'Europe/Istanbul', [profile(overrides)]);
}

function createDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON;');
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

function insertProfile(db, value = profile()) {
  db.prepare(
    'INSERT INTO earnings_profiles (' +
      'id,effective_from,model,currency,base_minor_units,overtime_hourly_minor_units,' +
      'overtime_after_minutes,overtime_multiplier_numerator,' +
      'overtime_multiplier_denominator,revision,source' +
      ") VALUES (?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    value.id,
    value.effectiveFrom,
    value.model,
    value.currency,
    value.baseMinorUnits,
    value.overtimeHourlyMinorUnits,
    value.overtimeAfterMinutes,
    value.overtimeMultiplierNumerator,
    value.overtimeMultiplierDenominator,
    value.revision,
  );
}

function insertWork(db, row = crossing) {
  db.prepare(
    'INSERT INTO actual_work_sessions (' +
      'id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,' +
      'end_choice,start_instant_utc,end_instant_utc,break_minutes,note' +
      ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    row.id,
    row.localDate,
    '23:00',
    row.endDate,
    '07:00',
    row.timeZone,
    'reject',
    'reject',
    row.startInstantUtc,
    row.endInstantUtc,
    row.breakMinutes,
    'User reported',
  );
}

async function declare(db, firstBreak, expectedRevision, recordedAt) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = await appendCustomPayBreakRevision(store(db), {
      workId: SOURCE_ID,
      startDay: 26,
      startPeriodBreakMinutes: firstBreak,
      expectedRevision,
      reason: 'Manually allocated boundary break',
      recordedAt,
    });
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

async function fixture() {
  const db = createDb();
  await writePayPeriodStartDay(store(db), DAY);
  insertProfile(db);
  return db;
}

test('safe single hourly rate: 26→25 actual work is priced in cents, not the calendar month', () => {
  const actual = work(
    'inside',
    '2026-11-10T05:00:00.000Z',
    '2026-11-10T13:00:00.000Z',
    '2026-11-10',
    '2026-11-10',
    30,
  );
  const r = estimateCustomHourlyWork(policy(), [{ work: actual }], 0);
  assert.equal(r.status, 'estimated');
  assert.equal(r.periodKey, PERIOD);
  assert.equal(r.startDate, '2026-10-26');
  assert.equal(r.endDateInclusive, '2026-11-25');
  assert.equal(r.scope, 'ACTUAL_WORK_ONLY_NO_ADJUSTMENTS');
  assert.equal(r.loggedSeconds, 7.5 * 3600);
  assert.equal(r.workOnlyMinorUnits, 75000);
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].sourceStartUtc, actual.startInstantUtc);
  assert.equal(r.lines[0].sourceBreakMinutes, 30);
  assert.equal(r.disclaimer, 'USER_REPORTED_PRE_TAX_ESTIMATE');
});

test('separate custom periods reconcile source gross seconds and explicitly audited breaks', async () => {
  const db = await fixture();
  try {
    insertWork(db);
    const before = await loadCustomHourlyEstimateFromStore(
      store(db),
      PERIOD,
      'Europe/Istanbul',
    );
    assert.equal(before.status, 'blocked');
    assert.ok(before.reasons.some((x) => x.includes('PAY_PERIOD_BREAK_ALLOCATION_REQUIRED')));
    await declare(db, 10, 0, '2026-11-15T18:00:00.000Z');
    const first = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    const second = await loadCustomHourlyEstimateFromStore(
      store(db),
      '2026-11',
      'Europe/Istanbul',
    );
    assert.equal(first.status, 'estimated');
    assert.equal(second.status, 'estimated');
    assert.equal(first.loggedSeconds, 50 * 60);
    assert.equal(second.loggedSeconds, 6 * 3600 + 40 * 60);
    assert.equal(first.loggedSeconds + second.loggedSeconds, 7.5 * 3600);
    assert.equal(first.workOnlyMinorUnits, 8333);
    assert.equal(second.workOnlyMinorUnits, 66667);
    assert.equal(first.workOnlyMinorUnits + second.workOnlyMinorUnits, 75000);
    assert.equal(first.lines[0].segmentEndUtc, second.lines[0].segmentStartUtc);
    assert.equal(first.lines[0].breakAuditRevision, 1);
    assert.equal(second.lines[0].breakAuditRevision, 1);
    assert.equal(first.lines[0].sourceBreakMinutes, 10);
    assert.equal(second.lines[0].sourceBreakMinutes, 20);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get().n,
      18,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n,
      0,
    );
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});

test('correcting an audited break recalculates the two periods without rewriting source', async () => {
  const db = await fixture();
  try {
    insertWork(db);
    await declare(db, 10, 0, '2026-11-15T18:00:00.000Z');
    await declare(db, 15, 1, '2026-11-15T18:01:00.000Z');
    const a = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    const b = await loadCustomHourlyEstimateFromStore(store(db), '2026-11', 'Europe/Istanbul');
    assert.equal(a.status, 'estimated');
    assert.equal(b.status, 'estimated');
    assert.equal(a.loggedSeconds, 45 * 60);
    assert.equal(b.loggedSeconds, 6 * 3600 + 45 * 60);
    assert.equal(a.lines[0].breakAuditRevision, 2);
    assert.equal(b.lines[0].breakAuditRevision, 2);
    assert.equal(a.workOnlyMinorUnits + b.workOnlyMinorUnits, 75000);
    assert.equal(
      db.prepare('SELECT break_minutes FROM actual_work_sessions').get().break_minutes,
      30,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocation_events').get().n,
      0,
    );
  } finally {
    db.close();
  }
});

test('custom-period overtime threshold resets per period and applies explicit multiplier', async () => {
  const db = createDb();
  try {
    await writePayPeriodStartDay(store(db), DAY);
    insertProfile(db, profile({ overtimeAfterMinutes: 60 }));
    insertWork(db);
    await declare(db, 10, 0, '2026-11-15T18:00:00.000Z');
    const a = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    const b = await loadCustomHourlyEstimateFromStore(store(db), '2026-11', 'Europe/Istanbul');
    assert.equal(a.status, 'estimated');
    assert.equal(b.status, 'estimated');
    assert.equal(a.regularSeconds, 50 * 60);
    assert.equal(a.overtimeSeconds, 0);
    assert.equal(b.regularSeconds, 60 * 60);
    assert.equal(b.overtimeSeconds, 5 * 3600 + 40 * 60);
    assert.equal(b.workOnlyMinorUnits, 10000 + 85000);
    assert.equal(a.workOnlyMinorUnits, 8333);
  } finally {
    db.close();
  }
});

test('multi-session tiny fractions use cumulative exact minor-unit rounding', () => {
  const works = [
    work(
      'tiny1',
      '2026-11-10T05:00:00.000Z',
      '2026-11-10T05:00:01.000Z',
      '2026-11-10',
      '2026-11-10',
    ),
    work(
      'tiny2',
      '2026-11-10T05:00:01.000Z',
      '2026-11-10T05:00:02.000Z',
      '2026-11-10',
      '2026-11-10',
    ),
    work(
      'tiny3',
      '2026-11-10T05:00:02.000Z',
      '2026-11-10T05:00:03.000Z',
      '2026-11-10',
      '2026-11-10',
    ),
  ];
  const p = policy(PERIOD, { baseMinorUnits: 1000 });
  const r = estimateCustomHourlyWork(
    p,
    works.map((item) => ({ work: item })),
    0,
  );
  assert.equal(r.status, 'estimated');
  assert.equal(r.loggedSeconds, 3);
  assert.equal(r.workOnlyMinorUnits, 1);
  assert.equal(
    r.lines.reduce((a, b) => a + b.amountMinorUnits, 0),
    1,
  );
});

test('profile transition, fixed pay, and missing start profile never produce money', () => {
  const source = { work: crossing };
  const transitions = planCustomPayProfiles(PERIOD, DAY, 'Europe/Istanbul', [
    profile(),
    profile({ id: 'nov', effectiveFrom: '2026-11-01', baseMinorUnits: 23000 }),
  ]);
  const fixed = planCustomPayProfiles(PERIOD, DAY, 'Europe/Istanbul', [
    profile({ model: 'monthly_fixed', overtimeAfterMinutes: null, baseMinorUnits: 300000 }),
  ]);
  const missing = planCustomPayProfiles(PERIOD, DAY, 'Europe/Istanbul', [
    profile({ effectiveFrom: '2026-11-01' }),
  ]);
  for (const [p, status] of [
    [transitions, 'blocked'],
    [fixed, 'blocked'],
    [missing, 'needs_profile'],
  ]) {
    const r = estimateCustomHourlyWork(p, [source], 0);
    assert.equal(r.status, status);
    assert.equal('workOnlyMinorUnits' in r, false);
  }
});

test('calendar-month bonuses, deductions or corrections block unapproved attribution', async () => {
  const db = await fixture();
  try {
    insertWork(
      db,
      work(
        'safe',
        '2026-11-10T05:00:00.000Z',
        '2026-11-10T06:00:00.000Z',
        '2026-11-10',
        '2026-11-10',
      ),
    );
    db.prepare(
      "INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,note,created_at) VALUES ('b1','2026-11','bonus','TRY',2500,'Calendar bonus','2026-11-15T18:00:00.000Z')",
    ).run();
    const r = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(r.status, 'blocked');
    assert.ok(r.reasons.includes('CUSTOM_PAY_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION'));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n, 1);
  } finally {
    db.close();
  }
});

test('missing custom break audit returns no value; calendar-month break audit cannot substitute', async () => {
  const db = await fixture();
  try {
    insertWork(db);
    db.prepare(
      'INSERT INTO earnings_month_break_allocations(work_id,start_period_key,start_month_break_minutes,original_break_minutes,original_start_utc,original_end_utc) VALUES(?,?,?,?,?,?)',
    ).run(SOURCE_ID, '2026-11', 5, 30, crossing.startInstantUtc, crossing.endInstantUtc);
    const r = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(r.status, 'blocked');
    assert.equal('workOnlyMinorUnits' in r, false);
  } finally {
    db.close();
  }
});

test('overlapping and duplicate source work rows block without partial wages', () => {
  const a = work(
    'a',
    '2026-11-10T05:00:00.000Z',
    '2026-11-10T07:00:00.000Z',
    '2026-11-10',
    '2026-11-10',
  );
  const b = work(
    'b',
    '2026-11-10T06:00:00.000Z',
    '2026-11-10T08:00:00.000Z',
    '2026-11-10',
    '2026-11-10',
  );
  const overlap = estimateCustomHourlyWork(policy(), [{ work: a }, { work: b }], 0);
  assert.equal(overlap.status, 'blocked');
  assert.ok(overlap.reasons.some((x) => x.startsWith('OVERLAPPING_CUSTOM_WORK')));
  const duplicate = estimateCustomHourlyWork(policy(), [{ work: a }, { work: a }], 0);
  assert.equal(duplicate.status, 'blocked');
  assert.ok(duplicate.reasons.some((x) => x.startsWith('DUPLICATE_CUSTOM_WORK_ID')));
});

test('planned, invalid-zone/source, stale break provenance, and fake audit revisions block', () => {
  const a = work(
    'a',
    '2026-11-10T05:00:00.000Z',
    '2026-11-10T07:00:00.000Z',
    '2026-11-10',
    '2026-11-10',
  );
  assert.equal(
    estimateCustomHourlyWork(policy(), [{ work: { ...a, source: 'planned' } }], 0).status,
    'blocked',
  );
  assert.equal(
    estimateCustomHourlyWork(policy(), [{ work: { ...a, timeZone: 'Pacific/Honolulu' } }], 0)
      .status,
    'blocked',
  );
  assert.equal(
    estimateCustomHourlyWork(
      policy(),
      [
        {
          work: crossing,
          allocation: {
            workId: SOURCE_ID,
            startPeriodKey: '2026-10',
            startPeriodBreakMinutes: 10,
            originalBreakMinutes: 30,
            originalStartUtc: crossing.startInstantUtc,
            originalEndUtc: '2026-11-26T03:00:00.000Z',
            source: 'user_entered',
          },
          auditRevision: 1,
        },
      ],
      0,
    ).status,
    'blocked',
  );
  assert.equal(
    estimateCustomHourlyWork(
      policy(),
      [
        {
          work: crossing,
          allocation: {
            workId: SOURCE_ID,
            startPeriodKey: '2026-10',
            startPeriodBreakMinutes: 10,
            originalBreakMinutes: 30,
            originalStartUtc: crossing.startInstantUtc,
            originalEndUtc: crossing.endInstantUtc,
            source: 'user_entered',
          },
        },
      ],
      0,
    ).status,
    'blocked',
  );
});

test('end-exclusive, no-work, and calendar day1 keep legacy monthly behavior isolated', () => {
  const end = work(
    'end',
    '2026-11-25T20:00:00.000Z',
    '2026-11-25T21:00:00.000Z',
    '2026-11-25',
    '2026-11-26',
  );
  const r = estimateCustomHourlyWork(policy(), [{ work: end }], 0);
  assert.equal(r.status, 'estimated');
  assert.equal(r.loggedSeconds, 3600);
  const noWork = estimateCustomHourlyWork(policy(), [], 0);
  assert.equal(noWork.status, 'no_work');
  const p = planCustomPayProfiles('2026-11', 1, 'Europe/Istanbul', [profile()]);
  assert.equal(estimateCustomHourlyWork(p, [{ work: end }], 0).status, 'disabled');
});

test('hourly 45-minute IANA offset and New York DST source use each work zone', () => {
  const ktm = work(
    'ktm',
    '2026-11-10T04:15:00.000Z',
    '2026-11-10T06:15:00.000Z',
    '2026-11-10',
    '2026-11-10',
  );
  const shifted = { ...ktm, timeZone: 'Asia/Kathmandu' };
  const r = estimateCustomHourlyWork(policy(), [{ work: shifted }], 0);
  assert.equal(r.status, 'estimated');
  assert.equal(r.loggedSeconds, 7200);
  assert.equal(r.lines[0].timeZone, 'Asia/Kathmandu');
  const nyc = work(
    'nyc',
    '2026-11-01T04:30:00.000Z',
    '2026-11-01T07:30:00.000Z',
    '2026-11-01',
    '2026-11-01',
  );
  const ny = estimateCustomHourlyWork(
    policy(),
    [{ work: { ...nyc, timeZone: 'America/New_York' } }],
    0,
  );
  assert.equal(ny.status, 'estimated');
  assert.equal(ny.loggedSeconds, 3 * 3600);
});

test('zero threshold is all overtime; null threshold never fabricates overtime', () => {
  const a = work(
    'a',
    '2026-11-10T05:00:00.000Z',
    '2026-11-10T07:00:00.000Z',
    '2026-11-10',
    '2026-11-10',
  );
  const full = estimateCustomHourlyWork(
    policy(PERIOD, { overtimeAfterMinutes: 0 }),
    [{ work: a }],
    0,
  );
  assert.equal(full.status, 'estimated');
  assert.equal(full.regularSeconds, 0);
  assert.equal(full.overtimeSeconds, 7200);
  assert.equal(full.workOnlyMinorUnits, 30000);
  const none = estimateCustomHourlyWork(policy(), [{ work: a }], 0);
  assert.equal(none.status, 'estimated');
  assert.equal(none.overtimeSeconds, 0);
  assert.equal(none.workOnlyMinorUnits, 20000);
});

test('repository read-only SQLite v8 uses current corrected hourly profile', async () => {
  const db = await fixture();
  try {
    const w = work(
      'w',
      '2026-11-10T05:00:00.000Z',
      '2026-11-10T07:00:00.000Z',
      '2026-11-10',
      '2026-11-10',
    );
    insertWork(db, w);
    db.prepare(
      'INSERT INTO earnings_profile_revisions(profile_id,revision,effective_from,model,currency,base_minor_units,overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,overtime_multiplier_denominator,reason,recorded_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      'p_oct',
      2,
      '2026-10-01',
      'hourly',
      'TRY',
      12000,
      0,
      null,
      3,
      2,
      'Correct hourly rate',
      '2026-11-15T18:00:00.000Z',
      'user_entered',
    );
    const a = await loadCustomHourlyEstimateFromStore(store(db), PERIOD, 'Europe/Istanbul');
    assert.equal(a.status, 'estimated');
    assert.equal(a.profileRevision, 2);
    assert.equal(a.workOnlyMinorUnits, 24000);
    assert.equal(
      db.prepare('SELECT base_minor_units FROM earnings_profiles').get().base_minor_units,
      10000,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profile_revisions').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});
