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
import { loadCustomPayProfilePreviewFromStore } from '../src/domain/custom-pay-profile-preview-store.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

function profile(id, effectiveFrom, overrides = {}) {
  return {
    id,
    effectiveFrom,
    model: 'hourly',
    currency: 'TRY',
    baseMinorUnits: 15000,
    overtimeHourlyMinorUnits: 0,
    overtimeAfterMinutes: 160 * 60,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}

function dbV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ]) {
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  }
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

function insertProfile(db, value) {
  db.prepare(
    'INSERT INTO earnings_profiles (' +
      'id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,' +
      'overtime_multiplier_numerator,overtime_multiplier_denominator,revision,source' +
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

function addRevision(db, original, revision, override = {}) {
  const next = { ...original, ...override, revision };
  db.prepare(
    'INSERT INTO earnings_profile_revisions (' +
      'profile_id,revision,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,' +
      'overtime_multiplier_numerator,overtime_multiplier_denominator,' +
      'reason,recorded_at,source)' +
      " VALUES (?,?,?,?,?,?,?,?,?,?,? ,?,'user_entered')",
  ).run(
    original.id,
    revision,
    original.effectiveFrom,
    next.model,
    next.currency,
    next.baseMinorUnits,
    next.overtimeHourlyMinorUnits,
    next.overtimeAfterMinutes,
    next.overtimeMultiplierNumerator,
    next.overtimeMultiplierDenominator,
    'User corrected historical rate',
    '2026-11-15T18:00:00.000Z',
  );
}

test('26→25 custom pay period visibly splits immutable October and November profiles', () => {
  const preview = planCustomPayProfiles('2026-10', 26, 'Europe/Istanbul', [
    profile('oct', '2026-10-01'),
    profile('nov', '2026-11-01', { baseMinorUnits: 22500 }),
  ]);
  assert.equal(preview.status, 'profile_transition_review_required');
  assert.equal(preview.periodKey, '2026-10');
  assert.equal(preview.startDate, '2026-10-26');
  assert.equal(preview.endDateInclusive, '2026-11-25');
  assert.deepEqual(
    preview.segments.map((s) => [
      s.startDate,
      s.endDateInclusive,
      s.profile.id,
      s.profile.baseMinorUnits,
    ]),
    [
      ['2026-10-26', '2026-10-31', 'oct', 15000],
      ['2026-11-01', '2026-11-25', 'nov', 22500],
    ],
  );
  assert.equal(preview.segments[0].startInstantUtc, '2026-10-25T21:00:00.000Z');
  assert.equal(preview.segments[0].endInstantUtc, '2026-10-31T21:00:00.000Z');
  assert.equal(preview.segments[1].startInstantUtc, '2026-10-31T21:00:00.000Z');
  assert.equal(preview.segments[1].endInstantUtc, '2026-11-25T21:00:00.000Z');
});

test('a single hourly snapshot is displayed but no estimated earnings are invented', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'Asia/Kathmandu', [
    profile('early', '2025-01-01', { revision: 3 }),
  ]);
  assert.equal(p.status, 'single_hourly_profile');
  assert.equal(p.segments.length, 1);
  assert.equal(p.segments[0].startInstantUtc, '2026-10-25T18:15:00.000Z');
  assert.equal(p.segments[0].endInstantUtc, '2026-11-25T18:15:00.000Z');
  assert.equal(p.segments[0].profile.revision, 3);
  assert.equal('totalMinorUnits' in p, false);
});

test('fixed salary needs an explicit full/partial period assumption', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'Europe/Istanbul', [
    profile('fixed', '2026-09-01', {
      model: 'monthly_fixed',
      baseMinorUnits: 900000,
      overtimeAfterMinutes: null,
    }),
  ]);
  assert.equal(p.status, 'fixed_salary_assumption_required');
  assert.equal(p.segments.length, 1);
  assert.equal(p.segments[0].profile.baseMinorUnits, 900000);
});

test('a new profile on the end-exclusive 26th must not enter the previous period', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'Europe/Istanbul', [
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01'),
    profile('later', '2026-12-01'),
  ]);
  assert.deepEqual(
    p.segments.map((s) => s.profile.id),
    ['old', 'new'],
  );
  const dayOne = planCustomPayProfiles('2026-11', 1, 'Europe/Istanbul', [
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01'),
    profile('later', '2026-12-01'),
  ]);
  assert.equal(dayOne.status, 'single_hourly_profile');
  assert.deepEqual(
    dayOne.segments.map((s) => s.profile.id),
    ['new'],
  );
});

test('missing opening profile blocks the plan despite a future effective profile', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'Europe/Istanbul', [
    profile('nov', '2026-11-01'),
  ]);
  assert.equal(p.status, 'needs_profile');
  assert.deepEqual(p.segments, []);
  assert.equal(planCustomPayProfiles('2026-10', 26, 'UTC', []).status, 'needs_profile');
});

test('matching money values still require review when a new effective revision identity starts', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'UTC', [
    profile('old', '2026-10-01'),
    profile('new', '2026-11-01'),
  ]);
  assert.equal(p.status, 'profile_transition_review_required');
  assert.notEqual(p.segments[0].profile.id, p.segments[1].profile.id);
});

test('mixed-currency or mixed-model changes are shown, never auto-converted or prorated', () => {
  const p = planCustomPayProfiles('2026-10', 26, 'UTC', [
    profile('oct', '2026-10-01'),
    profile('nov', '2026-11-01', {
      currency: 'USD',
      model: 'monthly_fixed',
      baseMinorUnits: 750000,
      overtimeAfterMinutes: null,
    }),
  ]);
  assert.equal(p.status, 'profile_transition_review_required');
  assert.deepEqual(
    p.segments.map((s) => s.profile.currency),
    ['TRY', 'USD'],
  );
  assert.deepEqual(
    p.segments.map((s) => s.profile.model),
    ['hourly', 'monthly_fixed'],
  );
});

test('February leap/nonleap and year rollover produce non-overlapping civil segments', () => {
  const leap = planCustomPayProfiles('2028-02', 26, 'UTC', [
    profile('feb', '2028-02-01'),
    profile('march', '2028-03-01'),
  ]);
  assert.deepEqual(
    leap.segments.map((s) => [s.startDate, s.endDateInclusive]),
    [
      ['2028-02-26', '2028-02-29'],
      ['2028-03-01', '2028-03-25'],
    ],
  );
  const plain = planCustomPayProfiles('2027-02', 26, 'UTC', [
    profile('feb', '2027-02-01'),
    profile('march', '2027-03-01'),
  ]);
  assert.equal(plain.segments[0].endDateInclusive, '2027-02-28');
  const year = planCustomPayProfiles('2026-12', 26, 'UTC', [
    profile('dec', '2026-12-01'),
    profile('jan', '2027-01-01'),
  ]);
  assert.equal(year.segments[0].endExclusiveDate, '2027-01-01');
  assert.equal(year.segments[1].endDateInclusive, '2027-01-25');
});

test('New York DST changes UTC elapsed span and still makes profile boundary contiguous', () => {
  const p = planCustomPayProfiles('2026-02', 26, 'America/New_York', [
    profile('feb', '2026-02-01'),
    profile('march', '2026-03-01'),
  ]);
  assert.equal(p.segments[0].startInstantUtc, '2026-02-26T05:00:00.000Z');
  assert.equal(p.segments[1].startInstantUtc, '2026-03-01T05:00:00.000Z');
  assert.equal(p.segments[1].endInstantUtc, '2026-03-26T04:00:00.000Z');
  assert.equal(p.segments[0].endInstantUtc, p.segments[1].startInstantUtc);
});

test('invalid, ambiguous and impossible period/timezone boundaries fail closed', () => {
  const p = profile('oct', '2026-10-01');
  assert.throws(() => planCustomPayProfiles('2026-13', 26, 'UTC', [p]));
  assert.throws(
    () => planCustomPayProfiles('2026-10', 31, 'UTC', [p]),
    /INVALID_PAY_PERIOD_START_DAY/,
  );
  assert.throws(() => planCustomPayProfiles('2026-10', 26, 'Mars\/Nowhere', [p]));
  assert.throws(() => planCustomPayProfiles('2026-10', 26, '', [p]));
  assert.throws(
    () => planCustomPayProfiles('2026-10', 26, 'UTC', [profile('wrong', '2026-10-20')]),
    /PROFILE_MUST_START_FIRST_OF_MONTH/,
  );
  assert.throws(
    () =>
      planCustomPayProfiles('2026-10', 26, 'UTC', [
        profile('a', '2026-10-01'),
        profile('b', '2026-10-01'),
      ]),
    /DUPLICATE_EFFECTIVE_MONTH/,
  );
  assert.throws(
    () =>
      planCustomPayProfiles('2018-11', 4, 'America/Sao_Paulo', [profile('old', '2018-10-01')]),
    /UNRESOLVED_PAY_PERIOD_BOUNDARY|AMBIGUOUS_PAY_PROFILE_MIDNIGHT/,
  );
});

test('read-only SQLite v1→v8 adapter resolves latest immutable corrected snapshots', async () => {
  const db = dbV8();
  try {
    const read = store(db);
    await writePayPeriodStartDay(read, 26);
    const oct = profile('oct', '2026-10-01');
    const nov = profile('nov', '2026-11-01', { baseMinorUnits: 23000 });
    insertProfile(db, oct);
    insertProfile(db, nov);
    addRevision(db, oct, 2, { baseMinorUnits: 18000 });
    const allSettingsBefore = db
      .prepare('SELECT key,value FROM app_settings ORDER BY key')
      .all()
      .map((row) => ({ ...row }));
    const p = await loadCustomPayProfilePreviewFromStore(read, '2026-10', 'Europe/Istanbul');
    assert.equal(p.status, 'profile_transition_review_required');
    assert.deepEqual(
      p.segments.map((s) => [s.profile.id, s.profile.revision, s.profile.baseMinorUnits]),
      [
        ['oct', 2, 18000],
        ['nov', 1, 23000],
      ],
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
    assert.deepEqual(
      db
        .prepare('SELECT key,value FROM app_settings ORDER BY key')
        .all()
        .map((row) => ({ ...row })),
      allSettingsBefore,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profile_revisions').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});

test('missing immutable profile revision fails rather than showing an unearned rate', async () => {
  const db = dbV8();
  try {
    const read = store(db);
    await writePayPeriodStartDay(read, 26);
    const oct = profile('oct', '2026-10-01');
    insertProfile(db, oct);
    addRevision(db, oct, 3, { baseMinorUnits: 20000 });
    await assert.rejects(
      () => loadCustomPayProfilePreviewFromStore(read, '2026-10', 'UTC'),
      /MISSING_OR_DUPLICATE_PROFILE_REVISION/,
    );
  } finally {
    db.close();
  }
});

test('read-only adapter refuses a changed user preference across its two reads', async () => {
  const db = dbV8();
  try {
    const read = store(db);
    await writePayPeriodStartDay(read, 26);
    insertProfile(db, profile('oct', '2026-10-01'));
    const changing = {
      ...read,
      async getAllAsync(sql, ...params) {
        if (sql.includes('earnings_profile_revisions')) await writePayPeriodStartDay(read, 27);
        return read.getAllAsync(sql, ...params);
      },
    };
    await assert.rejects(
      () => loadCustomPayProfilePreviewFromStore(changing, '2026-10', 'UTC'),
      /PAY_PROFILE_PREVIEW_SETTING_CHANGED/,
    );
  } finally {
    db.close();
  }
});
