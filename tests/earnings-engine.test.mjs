import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estimateEarnings,
  periodBounds,
  roundRational,
  validateAdjustment,
  validateEarningsProfile,
  validateEarningsWork,
} from '../src/domain/earnings-engine.ts';
import { parseMoneyMinor, formatMoneyMinor } from '../src/domain/money-text.ts';

const hourly = {
  id: 'profile_h',
  effectiveFrom: '2026-11-01',
  model: 'hourly',
  currency: 'TRY',
  baseMinorUnits: 15000,
  overtimeHourlyMinorUnits: 0,
  overtimeAfterMinutes: 180,
  overtimeMultiplierNumerator: 3,
  overtimeMultiplierDenominator: 2,
  revision: 1,
};
const fixed = {
  ...hourly,
  id: 'profile_m',
  model: 'monthly_fixed',
  baseMinorUnits: 5_000_000,
  overtimeHourlyMinorUnits: 20000,
};
function work(id, date, start, end, breakMinutes = 0, endDate = date) {
  return {
    id,
    localDate: date,
    endDate,
    startInstantUtc: start,
    endInstantUtc: end,
    breakMinutes,
    timeZone: 'Europe/Istanbul',
    source: 'user_entered',
  };
}
const fourHours = work(
  'work_1',
  '2026-11-15',
  '2026-11-15T05:00:00.000Z',
  '2026-11-15T09:00:00.000Z',
);
function adjustment(id, amountMinorUnits, kind = 'correction', date = '2026-11') {
  return {
    id,
    periodKey: date,
    kind,
    amountMinorUnits,
    currency: 'TRY',
    note: 'Manual',
    source: 'user_entered',
    createdAt: '2026-11-15T10:00:00.000Z',
  };
}

test('exact money input and formatting never use fractional float currency', () => {
  assert.equal(parseMoneyMinor('1.20'), 120);
  assert.equal(parseMoneyMinor('1,2'), 120);
  assert.equal(parseMoneyMinor('-1,25'), -125);
  assert.equal(parseMoneyMinor('0'), 0);
  assert.equal(parseMoneyMinor('1'), 100);
  assert.equal(parseMoneyMinor('12.3'), 1230);
  assert.equal(formatMoneyMinor(123456789, 'TRY', 'tr'), '1.234.567,89 TRY');
  assert.equal(formatMoneyMinor(-105, 'USD', 'en'), '-1.05 USD');
  for (const bad of ['1.234,56', '2.345', '1e3', '01.25', 'abc', '0.123', '']) {
    assert.throws(() => parseMoneyMinor(bad), /INVALID_MONEY_TEXT/);
  }
});

test('half-away-from-zero exact rational rounding applies only to line amounts', () => {
  assert.equal(roundRational(1n, 2n), 1);
  assert.equal(roundRational(-1n, 2n), -1);
  assert.equal(roundRational(1n, 3n), 0);
  assert.equal(roundRational(2n, 3n), 1);
  assert.throws(() => roundRational(1n, 0n), /INVALID_DIVISOR/);
});

test('hourly overtime uses explicit period minutes and user multiplier, not law', () => {
  const report = estimateEarnings('2026-11', [hourly], [fourHours], []);
  assert.equal(report.status, 'estimated');
  assert.equal(report.loggedSeconds, 14400);
  assert.equal(report.regularSeconds, 10800);
  assert.equal(report.overtimeSeconds, 3600);
  assert.equal(report.totalMinorUnits, 67500);
  assert.deepEqual(
    report.lines.map((l) => [l.kind, l.amountMinorUnits]),
    [
      ['hourly_regular', 45000],
      ['hourly_overtime', 22500],
    ],
  );
  assert.ok(
    report.lines.every(
      (l) => l.profileId === hourly.id && l.profileRevision === 1 && l.sourceId === 'work_1',
    ),
  );
  assert.equal(report.disclaimer, 'USER_REPORTED_PRE_TAX_ESTIMATE');
});

test('monthly fixed estimate keeps full base even without logs and shows overtime separately', () => {
  const noWork = estimateEarnings('2026-11', [fixed], [], []);
  assert.equal(noWork.status, 'estimated');
  assert.equal(noWork.totalMinorUnits, 5_000_000);
  const report = estimateEarnings('2026-11', [fixed], [fourHours], []);
  assert.equal(report.status, 'estimated');
  assert.equal(report.totalMinorUnits, 5_030_000);
  assert.deepEqual(
    report.lines.map((l) => [l.kind, l.amountMinorUnits]),
    [
      ['monthly_base', 5000000],
      ['logged_work', 0],
      ['monthly_overtime', 30000],
    ],
  );
});

test('no overtime threshold never creates implicit legally defined overtime', () => {
  const profile = {
    ...hourly,
    overtimeAfterMinutes: null,
    overtimeMultiplierNumerator: 1,
    overtimeMultiplierDenominator: 1,
  };
  const result = estimateEarnings('2026-11', [profile], [fourHours], []);
  assert.equal(result.status, 'estimated');
  assert.equal(result.totalMinorUnits, 60000);
  assert.equal(result.overtimeSeconds, 0);
  assert.equal(result.regularSeconds, 4 * 3600);
});

test('period overtime threshold is apportioned across sequential separate logs', () => {
  const first = work(
    'work_a',
    '2026-11-15',
    '2026-11-15T05:00:00.000Z',
    '2026-11-15T07:00:00.000Z',
  );
  const second = work(
    'work_b',
    '2026-11-15',
    '2026-11-15T08:00:00.000Z',
    '2026-11-15T10:00:00.000Z',
  );
  const result = estimateEarnings('2026-11', [hourly], [second, first], []);
  assert.equal(result.status, 'estimated');
  assert.deepEqual(
    result.lines.map((l) => [l.sourceId, l.kind, l.amountMinorUnits]),
    [
      ['work_a', 'hourly_regular', 30000],
      ['work_b', 'hourly_regular', 15000],
      ['work_b', 'hourly_overtime', 22500],
    ],
  );
});

test('UTC elapsed time rather than wall-clock DST labels determines user-reported hours', () => {
  const spring = work(
    'work_spring',
    '2026-03-08',
    '2026-03-08T04:00:00.000Z',
    '2026-03-08T11:00:00.000Z',
    30,
    '2026-03-08',
  );
  const profile = { ...hourly, effectiveFrom: '2026-03-01', overtimeAfterMinutes: null };
  const report = estimateEarnings('2026-03', [profile], [spring], []);
  assert.equal(report.status, 'estimated');
  assert.equal(report.loggedSeconds, 6.5 * 3600);
  assert.equal(report.totalMinorUnits, 97500);
});

test('all adjustment types are sourced, signed, deterministic and currency-checked', () => {
  const rows = [
    adjustment('adj_bonus', 25000, 'bonus'),
    adjustment('adj_cut', -7000, 'deduction'),
    adjustment('adj_correction', -300, 'correction'),
  ];
  const result = estimateEarnings('2026-11', [hourly], [], rows);
  assert.equal(result.status, 'estimated');
  assert.equal(result.totalMinorUnits, 17700);
  assert.equal(result.lines.length, 3);
  assert.ok(result.lines.every((l) => l.kind === 'adjustment' && l.profileId === hourly.id));
  const bad = estimateEarnings('2026-11', [hourly], [], [{ ...rows[0], currency: 'EUR' }]);
  assert.equal(bad.status, 'blocked');
  assert.match(bad.reasons.join(), /ADJUSTMENT_CURRENCY_MISMATCH/);
});

test('no profile means no fabricated pay; immutable effective-month selection', () => {
  assert.deepEqual(estimateEarnings('2026-10', [hourly], [], []), {
    status: 'needs_profile',
    periodKey: '2026-10',
  });
  const latest = {
    ...hourly,
    id: 'profile_new',
    effectiveFrom: '2026-12-01',
    baseMinorUnits: 25000,
  };
  const result = estimateEarnings('2026-12', [hourly, latest], [], []);
  assert.equal(result.status, 'estimated');
  assert.equal(result.profile.id, 'profile_new');
  assert.equal(result.profile.baseMinorUnits, 25000);
  assert.throws(
    () => validateEarningsProfile({ ...hourly, effectiveFrom: '2026-11-02' }),
    /PROFILE_MUST_START_FIRST_OF_MONTH/,
  );
  assert.throws(
    () => estimateEarnings('2026-11', [hourly, { ...hourly, id: 'different' }], [], []),
    /AMBIGUOUS_PROFILE_EFFECTIVE_DATE/,
  );
});

test('overlap, invalid break and nested overlapping intervals block entire report', () => {
  const outer = work(
    'outer',
    '2026-11-15',
    '2026-11-15T01:00:00.000Z',
    '2026-11-15T10:00:00.000Z',
  );
  const inner = work(
    'inner',
    '2026-11-15',
    '2026-11-15T02:00:00.000Z',
    '2026-11-15T03:00:00.000Z',
  );
  const third = work(
    'third',
    '2026-11-15',
    '2026-11-15T04:00:00.000Z',
    '2026-11-15T05:00:00.000Z',
  );
  const result = estimateEarnings('2026-11', [hourly], [outer, inner, third], []);
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.some((x) => x.includes('OVERLAPPING_WORK_SESSIONS')));
  const broken = estimateEarnings(
    '2026-11',
    [hourly],
    [{ ...fourHours, breakMinutes: 300 }],
    [],
  );
  assert.equal(broken.status, 'blocked');
  assert.match(broken.reasons.join(), /INVALID_WORK_BREAK/);
});

test('cross-month zero-break work is split, with an independent threshold per month', () => {
  const edge = work(
    'edge',
    '2026-11-30',
    '2026-11-30T20:00:00.000Z',
    '2026-12-01T04:00:00.000Z',
    0,
    '2026-12-01',
  );
  const r1 = estimateEarnings('2026-11', [hourly], [edge], []);
  const r2 = estimateEarnings(
    '2026-12',
    [{ ...hourly, id: 'later', effectiveFrom: '2026-12-01' }],
    [edge],
    [],
  );
  assert.equal(r1.status, 'estimated');
  assert.equal(r2.status, 'estimated');
  assert.equal(r1.loggedSeconds, 3600);
  assert.equal(r2.loggedSeconds, 7 * 3600);
  assert.equal(r1.totalMinorUnits, 15000);
  assert.equal(r2.totalMinorUnits, 135000);
  assert.equal(r1.lines[0].sourceId, 'edge');
  assert.equal(r2.lines[0].sourceId, 'edge');
});

test('profile and adjustments validate explicit currency, rate, multiplier and provenance', () => {
  assert.throws(
    () => validateEarningsProfile({ ...hourly, currency: 'JPY' }),
    /INVALID_CURRENCY/,
  );
  assert.throws(
    () => validateEarningsProfile({ ...hourly, baseMinorUnits: -1 }),
    /INVALID_MONEY_AMOUNT/,
  );
  assert.throws(
    () =>
      validateEarningsProfile({
        ...hourly,
        overtimeMultiplierNumerator: 1,
        overtimeMultiplierDenominator: 2,
      }),
    /INVALID_MULTIPLIER/,
  );
  assert.throws(
    () => validateEarningsProfile({ ...fixed, overtimeHourlyMinorUnits: 0 }),
    /OVERTIME_HOURLY_RATE_REQUIRED/,
  );
  assert.throws(
    () => validateAdjustment(adjustment('cut', 100, 'deduction')),
    /DEDUCTION_MUST_BE_NEGATIVE/,
  );
  assert.throws(
    () => validateAdjustment({ ...adjustment('a', 100), source: 'employer_verified' }),
    /UNVERIFIED_ADJUSTMENT_SOURCE/,
  );
  assert.throws(
    () => validateEarningsWork({ ...fourHours, source: 'employer_verified' }),
    /UNVERIFIED_WORK_SOURCE/,
  );
});

test('calendar period boundaries include leap February and reject invalid period', () => {
  assert.deepEqual(periodBounds('2028-02'), { first: '2028-02-01', last: '2028-02-29' });
  assert.deepEqual(periodBounds('2026-12'), { first: '2026-12-01', last: '2026-12-31' });
  assert.throws(() => periodBounds('2026-13'), /INVALID_EARNINGS_PERIOD/);
});

test('one-cent per hour rounding is line-local, not float accumulation', () => {
  const profile = { ...hourly, baseMinorUnits: 1, overtimeAfterMinutes: null };
  const halfHour = work(
    'half',
    '2026-11-15',
    '2026-11-15T05:00:00.000Z',
    '2026-11-15T05:30:00.000Z',
  );
  const result = estimateEarnings('2026-11', [profile], [halfHour], []);
  assert.equal(result.status, 'estimated');
  assert.equal(result.totalMinorUnits, 1);
});
