import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTodayEarningsFromSources,
  summarizeTodayEarnings,
  todayEarningsPeriod,
} from '../src/domain/today-earnings-summary.ts';
import { calendarDateInZone } from '../src/domain/shift-engine.ts';

const monthly = {
  status: 'estimated',
  periodKey: '2026-11',
  profile: { id: 'fixed', revision: 2, currency: 'TRY', model: 'monthly_fixed' },
  totalMinorUnits: 8450000,
  lines: [{ kind: 'monthly_base', sourceId: 'fixed' }],
  disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
};

function special(key = '2026-10', startDay = 26) {
  const period = todayEarningsPeriod('2026-11-16', startDay);
  return {
    status: 'estimated',
    periodKey: key,
    startDay,
    startDate: period.startDate,
    endDateInclusive: period.endDateInclusive,
    model: 'hourly_actual_work',
    currency: 'TRY',
    totalMinorUnits: 127500,
    workLines: [{ workId: 'actual_logged_1', amountMinorUnits: 127500 }],
    adjustmentLines: [],
    scope: 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}

test('P0: default day=1 selects exactly the current calendar month, not a custom report', () => {
  assert.deepEqual(todayEarningsPeriod('2026-11-16', 1), {
    mode: 'calendar',
    periodKey: '2026-11',
    startDay: 1,
    startDate: '2026-11-01',
    endDateInclusive: '2026-11-30',
  });
  const view = summarizeTodayEarnings(todayEarningsPeriod('2026-11-16', 1), monthly);
  assert.equal(view.status, 'estimated');
  assert.equal(view.totalMinorUnits, 8450000);
  assert.equal(view.currency, 'TRY');
  assert.equal(view.model, 'monthly_fixed');
});

test('P0: day=26 selects previous start month until local 25th, including year rollover', () => {
  assert.equal(todayEarningsPeriod('2026-11-25', 26).periodKey, '2026-10');
  assert.equal(todayEarningsPeriod('2026-11-26', 26).periodKey, '2026-11');
  assert.equal(todayEarningsPeriod('2027-01-01', 26).periodKey, '2026-12');
  assert.equal(todayEarningsPeriod('2028-02-27', 28).periodKey, '2028-01');
  assert.equal(todayEarningsPeriod('2028-02-28', 28).periodKey, '2028-02');
  assert.equal(
    todayEarningsPeriod(
      calendarDateInZone('Asia/Kathmandu', new Date('2026-11-25T19:00:00Z')),
      26,
    ).periodKey,
    '2026-11',
    'IANA-local Nov 26 is already a NEW custom period though UTC is Nov 25',
  );
});

test('P0: a verified custom report is the ONLY special-period source and not added to calendar month', () => {
  const period = todayEarningsPeriod('2026-11-16', 26);
  const result = summarizeTodayEarnings(period, special());
  assert.equal(result.status, 'estimated');
  assert.equal(result.totalMinorUnits, 127500);
  assert.equal(result.currency, 'TRY');
  assert.equal(result.period.startDate, '2026-10-26');
  assert.equal(result.period.endDateInclusive, '2026-11-25');
  assert.equal(summarizeTodayEarnings(period, monthly).status, 'blocked');
  assert.equal(
    summarizeTodayEarnings(todayEarningsPeriod('2026-11-16', 1), special()).status,
    'blocked',
  );
});

test('P0: missing profiles, blocked reports and hourly periods with no source lines show no number', () => {
  const period = todayEarningsPeriod('2026-11-16', 1);
  assert.equal(
    summarizeTodayEarnings(period, { status: 'needs_profile', periodKey: '2026-11' }).status,
    'needs_profile',
  );
  assert.equal(
    summarizeTodayEarnings(period, {
      status: 'blocked',
      periodKey: '2026-11',
      reasons: ['OVERLAP'],
    }).status,
    'blocked',
  );
  const emptyHour = {
    ...monthly,
    profile: { ...monthly.profile, model: 'hourly' },
    lines: [],
    totalMinorUnits: 0,
  };
  assert.equal(summarizeTodayEarnings(period, emptyHour).status, 'no_entries');
});

test('P0: stale, corrupted, wrong period, negative, unverified and wrong-currency amounts fail closed', () => {
  const month = todayEarningsPeriod('2026-11-16', 1);
  const period = todayEarningsPeriod('2026-11-16', 26);
  for (const corrupt of [
    { ...monthly, periodKey: '2026-10' },
    { ...monthly, totalMinorUnits: -1 },
    { ...monthly, totalMinorUnits: 1.2 },
    { ...monthly, profile: { ...monthly.profile, currency: 'TRY/USD' } },
    { ...monthly, disclaimer: 'OFFICIAL_PAYSLIP' },
  ]) {
    assert.equal(summarizeTodayEarnings(month, corrupt).status, 'blocked');
  }
  for (const corrupt of [
    { ...special(), periodKey: '2026-11' },
    { ...special(), startDay: 25 },
    { ...special(), startDate: '2026-10-25' },
    { ...special(), endDateInclusive: '2026-11-26' },
    { ...special(), currency: 'USD/TRY' },
    { ...special(), totalMinorUnits: NaN },
    { ...special(), totalMinorUnits: -99 },
    { ...special(), scope: 'NOT_VERIFIED' },
    { ...special(), disclaimer: 'OFFICIAL' },
    { status: 'blocked', periodKey: '2026-10', startDay: 26, reasons: ['FX'] },
    { status: 'disabled', periodKey: '2026-10', startDay: 1 },
  ]) {
    assert.equal(summarizeTodayEarnings(period, corrupt).status, 'blocked');
  }
});

test('P0: zero without actual work/adjustments is not represented as a paid period', () => {
  const period = todayEarningsPeriod('2026-11-16', 26);
  const view = summarizeTodayEarnings(period, {
    ...special(),
    workLines: [],
    adjustmentLines: [],
    totalMinorUnits: 0,
  });
  assert.equal(view.status, 'no_entries');
  assert.equal(
    summarizeTodayEarnings(period, {
      ...special(),
      workLines: [],
      adjustmentLines: [{ sourceId: 'self_reported_adjustment_1' }],
      totalMinorUnits: 500,
    }).status,
    'estimated',
  );
});

test('P0: source dispatcher reads ONLY default-month report when day=1', async () => {
  const calls = [];
  const result = await loadTodayEarningsFromSources('2026-11-16', 'Europe/Istanbul', {
    async readStartDay() {
      calls.push('setting');
      return 1;
    },
    async readMonth(key) {
      calls.push('month:' + key);
      return monthly;
    },
    async readCustom() {
      throw new Error('CUSTOM_SHOULD_NOT_RUN');
    },
  });
  assert.equal(result.status, 'estimated');
  assert.deepEqual(calls, ['setting', 'month:2026-11', 'setting']);
});

test('P0: custom dispatcher uses only the 26→25 report and passes the saved IANA schedule zone', async () => {
  const calls = [];
  const result = await loadTodayEarningsFromSources('2026-11-16', 'Asia/Kathmandu', {
    async readStartDay() {
      calls.push('setting');
      return 26;
    },
    async readMonth() {
      throw new Error('CALENDAR_SHOULD_NOT_RUN');
    },
    async readCustom(key, zone) {
      calls.push('custom:' + key + ':' + zone);
      return special();
    },
  });
  assert.equal(result.status, 'estimated');
  assert.deepEqual(calls, ['setting', 'custom:2026-10:Asia/Kathmandu', 'setting']);
});

test('P0: changing saved pay-period start day while report loads prevents stale displayed money', async () => {
  let reads = 0;
  const view = await loadTodayEarningsFromSources('2026-11-16', 'Europe/Istanbul', {
    async readStartDay() {
      return reads++ === 0 ? 26 : 1;
    },
    async readMonth() {
      throw new Error('MONTH_SHOULD_NOT_RUN');
    },
    async readCustom() {
      return special();
    },
  });
  assert.equal(view.status, 'blocked');
  assert.equal('totalMinorUnits' in view, false);
});

test('P0: bad pay period setting and repository errors never fall back to an invented salary', async () => {
  await assert.rejects(
    loadTodayEarningsFromSources('2026-11-16', 'Europe/Istanbul', {
      async readStartDay() {
        return 29;
      },
      async readMonth() {
        return monthly;
      },
      async readCustom() {
        return special();
      },
    }),
    /INVALID_PAY_PERIOD_START_DAY/,
  );
  await assert.rejects(
    loadTodayEarningsFromSources('2026-11-16', 'Europe/Istanbul', {
      async readStartDay() {
        return 1;
      },
      async readMonth() {
        throw new Error('SQLITE_IO_FAILURE');
      },
      async readCustom() {
        return special();
      },
    }),
    /SQLITE_IO_FAILURE/,
  );
});
