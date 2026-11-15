import assert from 'node:assert/strict';
import test from 'node:test';

import { splitWorkForMonth } from '../src/domain/earnings-period.ts';
import { estimateEarnings } from '../src/domain/earnings-engine.ts';
import { createEarningsExport } from '../src/domain/earnings-export.ts';

const profile = {
  id: 'rate_nov',
  effectiveFrom: '2026-11-01',
  model: 'hourly',
  currency: 'TRY',
  baseMinorUnits: 15000,
  overtimeHourlyMinorUnits: 0,
  overtimeAfterMinutes: null,
  overtimeMultiplierNumerator: 1,
  overtimeMultiplierDenominator: 1,
  revision: 1,
};
function session(
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
const istanbul = session(
  'nov_dec',
  'Europe/Istanbul',
  '2026-11-30',
  '2026-12-01',
  '2026-11-30T20:00:00.000Z',
  '2026-12-01T04:00:00.000Z',
);

function allocation(work, startMonthBreakMinutes) {
  return {
    workId: work.id,
    startPeriodKey: work.localDate.slice(0, 7),
    startMonthBreakMinutes,
    originalBreakMinutes: work.breakMinutes,
    originalStartUtc: work.startInstantUtc,
    originalEndUtc: work.endInstantUtc,
    source: 'user_entered',
  };
}

test('zero-break night work partitions into both months exactly once', () => {
  const nov = splitWorkForMonth(istanbul, '2026-11');
  const dec = splitWorkForMonth(istanbul, '2026-12');
  assert.equal(nov.netSeconds, 3600);
  assert.equal(dec.netSeconds, 7 * 3600);
  assert.equal(nov.endInstantUtc, dec.startInstantUtc);
  assert.equal(splitWorkForMonth(istanbul, '2026-10'), null);
  assert.equal(splitWorkForMonth(istanbul, '2027-01'), null);
  const first = estimateEarnings('2026-11', [profile], [istanbul], []);
  const later = estimateEarnings('2026-12', [profile], [istanbul], []);
  assert.equal(first.status, 'estimated');
  assert.equal(later.status, 'estimated');
  assert.equal(first.totalMinorUnits, 15000);
  assert.equal(later.totalMinorUnits, 105000);
  assert.equal(first.loggedSeconds + later.loggedSeconds, 8 * 3600);
  assert.equal(first.lines[0].sourceId, 'nov_dec');
  assert.equal(later.lines[0].sourceId, 'nov_dec');
});

test('each month selects its effective pay profile independently', () => {
  const dec = {
    ...profile,
    id: 'rate_dec',
    effectiveFrom: '2026-12-01',
    baseMinorUnits: 25000,
    revision: 2,
  };
  const profiles = [profile, dec];
  const november = estimateEarnings('2026-11', profiles, [istanbul], []);
  const december = estimateEarnings('2026-12', profiles, [istanbul], []);
  assert.equal(november.status, 'estimated');
  assert.equal(december.status, 'estimated');
  assert.equal(november.totalMinorUnits, 15000);
  assert.equal(december.totalMinorUnits, 175000);
  assert.equal(november.lines[0].profileId, 'rate_nov');
  assert.equal(december.lines[0].profileId, 'rate_dec');
  assert.equal(december.lines[0].profileRevision, 2);
});

test('period overtime threshold starts fresh and never double-counts UTC seconds', () => {
  const thresholdProfile = {
    ...profile,
    overtimeAfterMinutes: 120,
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
  };
  const first = estimateEarnings('2026-11', [thresholdProfile], [istanbul], []);
  const second = estimateEarnings('2026-12', [thresholdProfile], [istanbul], []);
  assert.equal(first.status, 'estimated');
  assert.equal(first.regularSeconds, 3600);
  assert.equal(first.overtimeSeconds, 0);
  assert.equal(second.regularSeconds, 2 * 3600);
  assert.equal(second.overtimeSeconds, 5 * 3600);
  assert.equal(first.totalMinorUnits, 15000);
  assert.equal(second.totalMinorUnits, 30000 + 112500);
});

test('cross-month breaks require explicit provenance and allocation in both months', () => {
  const work = { ...istanbul, breakMinutes: 30 };
  assert.equal(estimateEarnings('2026-11', [profile], [work], []).status, 'blocked');
  assert.equal(estimateEarnings('2026-12', [profile], [work], []).status, 'blocked');
  const a = allocation(work, 10);
  const nov = splitWorkForMonth(work, '2026-11', a);
  const dec = splitWorkForMonth(work, '2026-12', a);
  assert.equal(nov.netSeconds, 50 * 60);
  assert.equal(dec.netSeconds, (7 * 60 - 20) * 60);
  assert.equal(nov.netSeconds + dec.netSeconds, 7.5 * 3600);
  const n = estimateEarnings('2026-11', [profile], [work], [], [a]);
  const d = estimateEarnings('2026-12', [profile], [work], [], [a]);
  assert.equal(n.status, 'estimated');
  assert.equal(d.status, 'estimated');
  assert.equal(n.loggedSeconds + d.loggedSeconds, 7.5 * 3600);
  assert.equal(n.totalMinorUnits, 12500);
  assert.equal(d.totalMinorUnits, 100000);
});

test('break choices cannot exceed either UTC segment or use stale source data', () => {
  const work = { ...istanbul, breakMinutes: 90 };
  assert.throws(
    () => splitWorkForMonth(work, '2026-11', allocation(work, 70)),
    /BREAK_ALLOCATION_EXCEEDS_SEGMENT/,
  );
  const tooMuch = { ...istanbul, breakMinutes: 450 };
  assert.throws(
    () => splitWorkForMonth(tooMuch, '2026-12', allocation(tooMuch, 0)),
    /BREAK_ALLOCATION_EXCEEDS_SEGMENT/,
  );
  const withThirty = { ...istanbul, breakMinutes: 30 };
  assert.throws(
    () =>
      splitWorkForMonth(withThirty, '2026-11', {
        ...allocation(withThirty, 10),
        originalEndUtc: '2026-12-01T03:00:00.000Z',
      }),
    /INVALID_BREAK_ALLOCATION/,
  );
  assert.throws(
    () =>
      splitWorkForMonth(withThirty, '2026-11', {
        ...allocation(withThirty, 10),
        source: 'employer_verified',
      }),
    /INVALID_BREAK_ALLOCATION/,
  );
});

test('America/New_York fall-back creates 30min/3h30 crossing independent of phone zone', () => {
  const fall = session(
    'fold',
    'America/New_York',
    '2026-10-31',
    '2026-11-01',
    '2026-11-01T03:30:00.000Z',
    '2026-11-01T07:30:00.000Z',
  );
  const october = splitWorkForMonth(fall, '2026-10');
  const november = splitWorkForMonth(fall, '2026-11');
  assert.equal(october.netSeconds, 1800);
  assert.equal(november.netSeconds, 12600);
  assert.equal(october.endInstantUtc, '2026-11-01T04:00:00.000Z');
  assert.equal(october.netSeconds + november.netSeconds, 14400);
});

test('Asia/Kathmandu 45min offset and Australia/Adelaide half-hour offset split precisely', () => {
  const nep = session(
    'nepal',
    'Asia/Kathmandu',
    '2026-11-30',
    '2026-12-01',
    '2026-11-30T17:15:00.000Z',
    '2026-11-30T19:15:00.000Z',
  );
  const nov = splitWorkForMonth(nep, '2026-11');
  const dec = splitWorkForMonth(nep, '2026-12');
  assert.equal(nov.endInstantUtc, '2026-11-30T18:15:00.000Z');
  assert.equal(nov.netSeconds, 3600);
  assert.equal(dec.netSeconds, 3600);
  const adl = session(
    'adelaide',
    'Australia/Adelaide',
    '2026-11-30',
    '2026-12-01',
    '2026-11-30T12:30:00.000Z',
    '2026-11-30T14:30:00.000Z',
  );
  const adlNov = splitWorkForMonth(adl, '2026-11');
  const adlDec = splitWorkForMonth(adl, '2026-12');
  assert.equal(adlNov.endInstantUtc, '2026-11-30T13:30:00.000Z');
  assert.equal(adlNov.netSeconds, 3600);
  assert.equal(adlDec.netSeconds, 3600);
});

test('midnight endpoint belongs to previous month alone (end exclusive)', () => {
  const midnight = session(
    'midnight',
    'Europe/Istanbul',
    '2026-11-30',
    '2026-12-01',
    '2026-11-30T20:00:00.000Z',
    '2026-11-30T21:00:00.000Z',
  );
  assert.equal(splitWorkForMonth(midnight, '2026-11').netSeconds, 3600);
  assert.equal(splitWorkForMonth(midnight, '2026-12'), null);
});

test('stored civil date must agree with original UTC instant in original zone', () => {
  const corrupt = { ...istanbul, localDate: '2026-12-01' };
  assert.throws(() => splitWorkForMonth(corrupt, '2026-11'), /WORK_DATE_ZONE_MISMATCH/);
  const report = estimateEarnings('2026-11', [profile], [corrupt], []);
  assert.equal(report.status, 'blocked');
  assert.match(report.reasons.join(), /WORK_DATE_ZONE_MISMATCH/);
});

test('overlapping time intervals still fail closed after month clipping', () => {
  const a = session(
    'a',
    'Europe/Istanbul',
    '2026-11-30',
    '2026-12-01',
    '2026-11-30T20:00:00.000Z',
    '2026-12-01T04:00:00.000Z',
  );
  const b = session(
    'b',
    'Europe/Istanbul',
    '2026-12-01',
    '2026-12-01',
    '2026-11-30T22:00:00.000Z',
    '2026-12-01T02:00:00.000Z',
  );
  const report = estimateEarnings('2026-12', [profile], [a, b], []);
  assert.equal(report.status, 'blocked');
  assert.match(report.reasons.join(), /OVERLAPPING_WORK_SESSIONS/);
});

test('export is deterministic, blocked reports cannot be shared, CSV formulas escaped', () => {
  const note = {
    id: 'adj_note',
    periodKey: '2026-11',
    kind: 'bonus',
    currency: 'TRY',
    amountMinorUnits: 500,
    note: '=HYPERLINK("http://example.test")',
    source: 'user_entered',
    createdAt: '2026-11-15T09:00:00.000Z',
  };
  const report = estimateEarnings('2026-11', [profile], [istanbul], [note]);
  assert.equal(report.status, 'estimated');
  const json = createEarningsExport(report, 'json');
  const csv = createEarningsExport(report, 'csv');
  assert.equal(json.mimeType, 'application/json');
  assert.equal(csv.mimeType, 'text/csv');
  assert.equal(JSON.parse(json.content).totalMinorUnits, report.totalMinorUnits);
  const injected = {
    ...report,
    lines: report.lines.map((line) => ({
      ...line, description: '=HYPERLINK("http://example.test")',
    })),
  };
  assert.ok(createEarningsExport(injected, 'csv').content.includes("'=HYPERLINK"));
  assert.equal(createEarningsExport(report, 'csv').content, csv.content);
  const blocked = estimateEarnings(
    '2026-11',
    [profile],
    [{ ...istanbul, breakMinutes: 20 }],
    [],
  );
  assert.throws(() => createEarningsExport(blocked, 'json'), /EARNINGS_NOT_EXPORTABLE/);
  assert.throws(() => createEarningsExport(report, 'pdf'), /INVALID_EARNINGS_EXPORT_FORMAT/);
});
