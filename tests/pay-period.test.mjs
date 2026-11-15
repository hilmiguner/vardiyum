import assert from 'node:assert/strict';
import test from 'node:test';

import {
  customPayPeriodBounds,
  payPeriodForDate,
  splitWorkForPayPeriod,
  zonedPayPeriodBounds,
} from '../src/domain/pay-period.ts';
import { splitWorkForMonth } from '../src/domain/earnings-period.ts';

function work(
  id,
  zone,
  localDate,
  endDate,
  startInstantUtc,
  endInstantUtc,
  breakMinutes = 0,
) {
  return {
    id,
    timeZone: zone,
    localDate,
    endDate,
    startInstantUtc,
    endInstantUtc,
    breakMinutes,
    source: 'user_entered',
  };
}

function choice(entry, firstBreak, firstKey) {
  return {
    workId: entry.id,
    startPeriodKey: firstKey,
    startPeriodBreakMinutes: firstBreak,
    originalBreakMinutes: entry.breakMinutes,
    originalStartUtc: entry.startInstantUtc,
    originalEndUtc: entry.endInstantUtc,
    source: 'user_entered',
  };
}

const crossing = work(
  'night_25_26',
  'Europe/Istanbul',
  '2026-11-25',
  '2026-11-26',
  '2026-11-25T20:00:00.000Z',
  '2026-11-26T04:00:00.000Z',
);

test('26 -> 25 uses the start-month key; February and New Year are exact', () => {
  assert.deepEqual(customPayPeriodBounds('2026-10', 26), {
    periodKey: '2026-10',
    startDay: 26,
    startDate: '2026-10-26',
    endDateInclusive: '2026-11-25',
    endExclusiveDate: '2026-11-26',
  });
  assert.equal(payPeriodForDate('2026-11-25', 26), '2026-10');
  assert.equal(payPeriodForDate('2026-11-26', 26), '2026-11');
  assert.equal(payPeriodForDate('2027-01-01', 26), '2026-12');
  assert.equal(customPayPeriodBounds('2026-12', 26).endDateInclusive, '2027-01-25');
  assert.equal(customPayPeriodBounds('2028-02', 28).endDateInclusive, '2028-03-27');
  assert.equal(customPayPeriodBounds('2027-01', 28).endDateInclusive, '2027-02-27');
  assert.equal(customPayPeriodBounds('2027-02', 28).endDateInclusive, '2027-03-27');
});

test('start day is exactly 1..28; invalid dates and arithmetic fail closed', () => {
  for (const bad of [0, 29, 30, 31, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => customPayPeriodBounds('2026-11', bad), /INVALID_PAY_PERIOD_START_DAY/);
  }
  assert.throws(() => customPayPeriodBounds('0000-11', 26), /INVALID_PAY_PERIOD_KEY/);
  assert.throws(() => customPayPeriodBounds('9999-12', 26), /PAY_PERIOD_OUT_OF_RANGE/);
  assert.throws(() => payPeriodForDate('0001-01-05', 26), /PAY_PERIOD_OUT_OF_RANGE/);
  assert.throws(() => payPeriodForDate('2026-02-30', 26), /INVALID_DATE/);
  assert.throws(() => customPayPeriodBounds('2026-13', 26), /INVALID_PAY_PERIOD_KEY/);
});

test('custom boundary keeps UTC work seconds, end-exclusive; both reports sum exactly', () => {
  const oct = splitWorkForPayPeriod(crossing, '2026-10', 26);
  const nov = splitWorkForPayPeriod(crossing, '2026-11', 26);
  assert.equal(oct.netSeconds, 3600);
  assert.equal(nov.netSeconds, 7 * 3600);
  assert.equal(oct.endInstantUtc, nov.startInstantUtc);
  assert.equal(oct.netSeconds + nov.netSeconds, 8 * 3600);
  assert.equal(oct.splitAcrossPeriods, true);
  assert.equal(splitWorkForPayPeriod(crossing, '2026-09', 26), null);
  assert.equal(splitWorkForPayPeriod(crossing, '2026-12', 26), null);
  assert.equal(oct.originStartUtc, crossing.startInstantUtc);
  assert.equal(nov.originEndUtc, crossing.endInstantUtc);
});

test('calendar day 1 remains bit-for-bit compatible with existing month partition', () => {
  const entry = work(
    'month_boundary',
    'Europe/Istanbul',
    '2026-11-30',
    '2026-12-01',
    '2026-11-30T20:00:00.000Z',
    '2026-12-01T04:00:00.000Z',
  );
  for (const key of ['2026-11', '2026-12']) {
    const existing = splitWorkForMonth(entry, key);
    const custom = splitWorkForPayPeriod(entry, key, 1);
    assert.equal(custom.startInstantUtc, existing.startInstantUtc);
    assert.equal(custom.endInstantUtc, existing.endInstantUtc);
    assert.equal(custom.netSeconds, existing.netSeconds);
  }
});

test('manual cross-period break requires source-bound split; no automatic assignment', () => {
  const entry = { ...crossing, breakMinutes: 30 };
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-10', 26),
    /PAY_PERIOD_BREAK_ALLOCATION_REQUIRED/,
  );
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-11', 26),
    /PAY_PERIOD_BREAK_ALLOCATION_REQUIRED/,
  );
  const allocation = choice(entry, 10, '2026-10');
  const oct = splitWorkForPayPeriod(entry, '2026-10', 26, allocation);
  const nov = splitWorkForPayPeriod(entry, '2026-11', 26, allocation);
  assert.equal(oct.netSeconds, 50 * 60);
  assert.equal(nov.netSeconds, 6 * 3600 + 40 * 60);
  assert.equal(oct.netSeconds + nov.netSeconds, 7.5 * 3600);
  assert.equal(oct.breakMinutes + nov.breakMinutes, entry.breakMinutes);
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-10', 26, choice(entry, 70, '2026-10')),
    /INVALID_PAY_PERIOD_BREAK_ALLOCATION/,
  );
  assert.throws(
    () =>
      splitWorkForPayPeriod(entry, '2026-11', 26, {
        ...allocation,
        originalEndUtc: '2026-11-26T03:00:00.000Z',
      }),
    /INVALID_PAY_PERIOD_BREAK_ALLOCATION/,
  );
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-10', 26, choice(entry, 10, '2026-11')),
    /INVALID_PAY_PERIOD_BREAK_ALLOCATION/,
  );
});

test('excessive break on either boundary piece fails closed', () => {
  const entry = { ...crossing, breakMinutes: 90 };
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-10', 26, choice(entry, 70, '2026-10')),
    /PAY_PERIOD_BREAK_EXCEEDS_SEGMENT/,
  );
  assert.throws(
    () => splitWorkForPayPeriod(entry, '2026-11', 26, choice(entry, 0, '2026-10')),
    /PAY_PERIOD_BREAK_EXCEEDS_SEGMENT/,
  );
});

test('Nepal +05:45 and Adelaide +10:30 respect fractional offsets', () => {
  const nep = work(
    'nep',
    'Asia/Kathmandu',
    '2026-11-25',
    '2026-11-26',
    '2026-11-25T17:15:00.000Z',
    '2026-11-25T19:15:00.000Z',
  );
  const adl = work(
    'adl',
    'Australia/Adelaide',
    '2026-11-25',
    '2026-11-26',
    '2026-11-25T12:30:00.000Z',
    '2026-11-25T14:30:00.000Z',
  );
  assert.equal(splitWorkForPayPeriod(nep, '2026-10', 26).netSeconds, 3600);
  assert.equal(splitWorkForPayPeriod(nep, '2026-11', 26).netSeconds, 3600);
  assert.equal(
    zonedPayPeriodBounds('2026-11', 26, 'Asia/Kathmandu').startInstantUtc,
    '2026-11-25T18:15:00.000Z',
  );
  assert.equal(splitWorkForPayPeriod(adl, '2026-10', 26).netSeconds, 3600);
  assert.equal(splitWorkForPayPeriod(adl, '2026-11', 26).netSeconds, 3600);
});

test('DST fall-back uses actual elapsed seconds instead of local wall minutes', () => {
  const entry = work(
    'fall',
    'America/New_York',
    '2026-10-31',
    '2026-11-01',
    '2026-11-01T03:30:00.000Z',
    '2026-11-01T07:30:00.000Z',
  );
  assert.equal(splitWorkForPayPeriod(entry, '2026-10', 1).netSeconds, 1800);
  assert.equal(splitWorkForPayPeriod(entry, '2026-11', 1).netSeconds, 12600);
  const gap = work(
    'spring',
    'America/New_York',
    '2026-03-08',
    '2026-03-08',
    '2026-03-08T06:30:00.000Z',
    '2026-03-08T08:30:00.000Z',
  );
  assert.equal(splitWorkForPayPeriod(gap, '2026-03', 8).netSeconds, 7200);
});

test('end at exact midnight belongs exclusively to the previous period', () => {
  const entry = work(
    'exact_midnight',
    'Europe/Istanbul',
    '2026-11-25',
    '2026-11-26',
    '2026-11-25T20:00:00.000Z',
    '2026-11-25T21:00:00.000Z',
  );
  assert.equal(splitWorkForPayPeriod(entry, '2026-10', 26).netSeconds, 3600);
  assert.equal(splitWorkForPayPeriod(entry, '2026-11', 26), null);
});

test('unverified, stale, or malformed source work fails closed', () => {
  assert.throws(
    () => splitWorkForPayPeriod({ ...crossing, localDate: '2026-11-24' }, '2026-10', 26),
    /PAY_PERIOD_WORK_ZONE_MISMATCH/,
  );
  assert.throws(
    () => splitWorkForPayPeriod({ ...crossing, source: 'planned' }, '2026-10', 26),
    /INVALID_PAY_PERIOD_WORK/,
  );
  assert.throws(
    () => splitWorkForPayPeriod({ ...crossing, breakMinutes: 481 }, '2026-10', 26),
    /INVALID_PAY_PERIOD_WORK/,
  );
  assert.throws(
    () =>
      splitWorkForPayPeriod(
        { ...crossing, endInstantUtc: '2026-11-26T04:00:00+00:00' },
        '2026-10',
        26,
      ),
    /INVALID_PAY_PERIOD_WORK/,
  );
  assert.throws(
    () =>
      splitWorkForPayPeriod(
        { ...crossing, timeZone: 'Invalid/Timezone' },
        '2026-10',
        26,
      ),
    /INVALID_TIME_ZONE/,
  );
});
