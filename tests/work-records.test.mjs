import assert from 'node:assert/strict';
import test from 'node:test';

import {
  effectiveBoundaryPolicy, prepareBoundaryChoice, prepareActualWork,
  scheduleBoundarySignature,
} from '../src/domain/work-records.ts';
import { resolveShiftInterval } from '../src/domain/zoned-shift-time.ts';

const repeatedShift = {
  id: 'repeat_shift', name: 'Repeated', color: '#9988AA',
  startsAt: '01:30', endsAt: '02:30', endDayOffset: 0,
  breakMinutes: 0, isRestDay: false,
};
const zone = 'America/New_York';

test('daily fold choice is signed against date/template/timezone, never global', () => {
  const saved = prepareBoundaryChoice(
    '2026-11-01', repeatedShift, zone, { start: 'earlier', end: 'reject' },
  );
  assert.deepEqual(effectiveBoundaryPolicy(
    '2026-11-01', repeatedShift, zone, saved,
  ), { start: 'earlier', end: 'reject' });
  assert.deepEqual(effectiveBoundaryPolicy(
    '2026-11-02', repeatedShift, zone, saved,
  ), { start: 'reject', end: 'reject' });
  assert.deepEqual(effectiveBoundaryPolicy(
    '2026-11-01', repeatedShift, 'Europe/Istanbul', saved,
  ), { start: 'reject', end: 'reject' });
  assert.deepEqual(effectiveBoundaryPolicy(
    '2026-11-01', { ...repeatedShift, startsAt: '01:00' }, zone, saved,
  ), { start: 'reject', end: 'reject' });
  assert.deepEqual(effectiveBoundaryPolicy(
    '2026-11-01', { ...repeatedShift, id: 'another_shift' }, zone, saved,
  ), { start: 'reject', end: 'reject' });
  assert.equal(
    scheduleBoundarySignature(repeatedShift, zone),
    scheduleBoundarySignature({ ...repeatedShift, name: 'Renamed' }, zone),
  );
});

test('only a fully resolved positive interval can be saved as a choice', () => {
  assert.throws(
    () => prepareBoundaryChoice(
      '2026-11-01', repeatedShift, zone, { start: 'reject', end: 'reject' },
    ),
    /AMBIGUOUS_START/,
  );
  assert.throws(
    () => prepareBoundaryChoice(
      '2026-03-08',
      { ...repeatedShift, startsAt: '02:30', endsAt: '03:30' },
      zone, { start: 'later', end: 'reject' },
    ),
    /NONEXISTENT_START/,
  );
  const saved = prepareBoundaryChoice(
    '2026-11-01', repeatedShift, zone, { start: 'later', end: 'reject' },
  );
  const actual = resolveShiftInterval(
    '2026-11-01', repeatedShift, zone,
    effectiveBoundaryPolicy('2026-11-01', repeatedShift, zone, saved),
  );
  assert.equal(actual.status, 'resolved');
  assert.equal(actual.elapsedSeconds, 3600);
});

const baseActual = {
  localDate: '2026-11-01',
  startClock: '01:30',
  endDate: '2026-11-01',
  endClock: '02:30',
  timeZone: zone,
  startChoice: 'reject',
  endChoice: 'reject',
  breakMinutes: 10,
  note: '  self reported  ',
};

test('actual work never inherits the scheduled fold choice', () => {
  const invalid = prepareActualWork(baseActual);
  assert.deepEqual(invalid, { status: 'invalid', reason: 'AMBIGUOUS_ACTUAL_START' });
  const first = prepareActualWork({ ...baseActual, startChoice: 'earlier' });
  const second = prepareActualWork({ ...baseActual, startChoice: 'later' });
  assert.equal(first.status, 'valid');
  assert.equal(second.status, 'valid');
  assert.equal(first.session.elapsedSeconds, 7200);
  assert.equal(first.session.netLoggedSeconds, 6600);
  assert.equal(first.session.note, 'self reported');
  assert.equal(second.session.elapsedSeconds, 3600);
  assert.equal(second.session.netLoggedSeconds, 3000);
  assert.equal(first.session.startInstantUtc, '2026-11-01T05:30:00.000Z');
  assert.equal(second.session.startInstantUtc, '2026-11-01T06:30:00.000Z');
});

test('actual fall-back second ambiguous end requires its own explicit choice', () => {
  const entry = {
    ...baseActual, startClock: '00:30', endClock: '01:30',
  };
  assert.deepEqual(prepareActualWork(entry), {
    status: 'invalid', reason: 'AMBIGUOUS_ACTUAL_END',
  });
  const later = prepareActualWork({ ...entry, endChoice: 'later' });
  assert.equal(later.status, 'valid');
  assert.equal(later.session.elapsedSeconds, 7200);
});

test('a nonexistent local clock cannot be stored as actual work', () => {
  assert.deepEqual(
    prepareActualWork({
      ...baseActual, localDate: '2026-03-08',
      startClock: '02:30', endDate: '2026-03-08',
      startChoice: 'later',
    }),
    { status: 'invalid', reason: 'NONEXISTENT_ACTUAL_START' },
  );
});

test('actual interval, break, date and note are validated', () => {
  assert.deepEqual(
    prepareActualWork({ ...baseActual, startChoice: 'earlier', endClock: '00:30' }),
    { status: 'invalid', reason: 'INVALID_ACTUAL_INTERVAL' },
  );
  assert.deepEqual(
    prepareActualWork({ ...baseActual, startChoice: 'earlier', breakMinutes: 200 }),
    { status: 'invalid', reason: 'INVALID_ACTUAL_INTERVAL' },
  );
  assert.deepEqual(
    prepareActualWork({ ...baseActual, breakMinutes: -1 }),
    { status: 'invalid', reason: 'INVALID_ACTUAL_BREAK' },
  );
  assert.deepEqual(
    prepareActualWork({ ...baseActual, endDate: '2026-11-05' }),
    { status: 'invalid', reason: 'INVALID_ACTUAL_DATE' },
  );
  assert.deepEqual(
    prepareActualWork({ ...baseActual, note: 'x'.repeat(201) }),
    { status: 'invalid', reason: 'INVALID_ACTUAL_NOTE' },
  );
});

test('actual timestamps remain explicit UTC snapshot independent of travel', () => {
  const original = prepareActualWork({
    ...baseActual,
    localDate: '2026-03-07',
    startClock: '23:00', endDate: '2026-03-08', endClock: '07:00',
    startChoice: 'reject', endChoice: 'reject', breakMinutes: 30,
  });
  assert.equal(original.status, 'valid');
  assert.equal(original.session.startInstantUtc, '2026-03-08T04:00:00.000Z');
  assert.equal(original.session.endInstantUtc, '2026-03-08T11:00:00.000Z');
  assert.equal(original.session.elapsedSeconds, 7 * 3600);
  assert.equal(original.session.netLoggedSeconds, 6.5 * 3600);
  assert.equal(original.session.timeZone, zone);
});

test('rest days can still receive a self-reported extra work session', () => {
  const entry = prepareActualWork({
    ...baseActual, localDate: '2026-12-31', startClock: '23:00',
    endDate: '2027-01-01', endClock: '01:00',
    startChoice: 'reject', endChoice: 'reject', breakMinutes: 0,
  });
  assert.equal(entry.status, 'valid');
  assert.equal(entry.session.elapsedSeconds, 7200);
});
