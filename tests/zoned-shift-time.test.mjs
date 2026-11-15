import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_TEMPLATES } from '../src/domain/shift-engine.ts';
import {
  elapsedLabel,
  possibleUtcInstants,
  resolveLocalBoundary,
  resolveShiftInterval,
} from '../src/domain/zoned-shift-time.ts';

const overnight = {
  id: 'night_custom',
  name: 'Night',
  color: '#123ABC',
  startsAt: '23:00',
  endsAt: '07:00',
  endDayOffset: 1,
  breakMinutes: 30,
  isRestDay: false,
};

test('spring-forward night is 7 actual hours, not 8 wall-clock hours', () => {
  const result = resolveShiftInterval('2026-03-07', overnight, 'America/New_York');
  assert.equal(result.status, 'resolved');
  assert.equal(result.wallMinutes, 480);
  assert.equal(result.elapsedSeconds, 7 * 3600);
  assert.equal(result.startInstantUtc, '2026-03-08T04:00:00.000Z');
  assert.equal(result.endInstantUtc, '2026-03-08T11:00:00.000Z');
  assert.equal(result.breakMinutesPlanned, 30);
});

test('fall-back night is 9 actual hours, not 8 wall-clock hours', () => {
  const result = resolveShiftInterval('2026-10-31', overnight, 'America/New_York');
  assert.equal(result.status, 'resolved');
  assert.equal(result.wallMinutes, 480);
  assert.equal(result.elapsedSeconds, 9 * 3600);
  assert.equal(result.startInstantUtc, '2026-11-01T03:00:00.000Z');
  assert.equal(result.endInstantUtc, '2026-11-01T12:00:00.000Z');
});

test('Istanbul does not change offsets in modern DST transition dates', () => {
  const result = resolveShiftInterval('2026-03-28', overnight, 'Europe/Istanbul');
  assert.equal(result.status, 'resolved');
  assert.equal(result.elapsedSeconds, 8 * 3600);
});

test('southern hemisphere DST reversal is recognized', () => {
  const result = resolveShiftInterval('2026-04-04', overnight, 'Australia/Sydney');
  assert.equal(result.status, 'resolved');
  assert.equal(result.elapsedSeconds, 9 * 3600);
});

test('half-hour Lord Howe change produces a 7.5-hour actual night', () => {
  const result = resolveShiftInterval('2026-10-03', overnight, 'Australia/Lord_Howe');
  assert.equal(result.status, 'resolved');
  assert.equal(result.wallMinutes, 480);
  assert.equal(result.elapsedSeconds, 450 * 60);
});

test('non-hour offset and leap-day overnight boundary round-trip', () => {
  const result = resolveShiftInterval('2028-02-29', overnight, 'Asia/Kathmandu');
  assert.equal(result.status, 'resolved');
  assert.equal(result.elapsedSeconds, 8 * 3600);
  assert.equal(result.startInstantUtc, '2028-02-29T17:15:00.000Z');
});

test('fall-back local start is ambiguous and rejected unless explicitly resolved', () => {
  const options = possibleUtcInstants('2026-11-01', '01:30', 'America/New_York');
  assert.deepEqual(options, ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  assert.deepEqual(resolveLocalBoundary('2026-11-01', '01:30', 'America/New_York'), {
    status: 'ambiguous',
    optionsUtc: options,
  });
  assert.deepEqual(resolveLocalBoundary('2026-11-01', '01:30', 'America/New_York', 'earlier'), {
    status: 'resolved',
    instantUtc: options[0],
    interpretation: 'earlier',
  });
  assert.deepEqual(resolveLocalBoundary('2026-11-01', '01:30', 'America/New_York', 'later'), {
    status: 'resolved',
    instantUtc: options[1],
    interpretation: 'later',
  });
});

test('fall-back boundary policy changes elapsed time only with explicit choice', () => {
  const shift = { ...overnight, startsAt: '01:30', endsAt: '02:30', endDayOffset: 0 };
  assert.equal(
    resolveShiftInterval('2026-11-01', shift, 'America/New_York').reason,
    'AMBIGUOUS_START',
  );
  const earlier = resolveShiftInterval('2026-11-01', shift, 'America/New_York', {
    start: 'earlier',
    end: 'reject',
  });
  const later = resolveShiftInterval('2026-11-01', shift, 'America/New_York', {
    start: 'later',
    end: 'reject',
  });
  assert.equal(earlier.status, 'resolved');
  assert.equal(later.status, 'resolved');
  assert.equal(earlier.elapsedSeconds, 7200);
  assert.equal(later.elapsedSeconds, 3600);
});

test('fall-back end can be ambiguous independently from start', () => {
  const shift = { ...overnight, startsAt: '00:30', endsAt: '01:30', endDayOffset: 0 };
  const result = resolveShiftInterval('2026-11-01', shift, 'America/New_York');
  assert.equal(result.status, 'unresolved');
  assert.equal(result.reason, 'AMBIGUOUS_END');
  assert.equal(result.boundaryOptionsUtc?.length, 2);
});

test('spring-forward gap is rejected even if earlier/later is requested', () => {
  assert.deepEqual(resolveLocalBoundary('2026-03-08', '02:30', 'America/New_York'), {
    status: 'nonexistent',
  });
  assert.deepEqual(resolveLocalBoundary('2026-03-08', '02:30', 'America/New_York', 'later'), {
    status: 'nonexistent',
  });
  const nonexistentStart = {
    ...overnight,
    startsAt: '02:30',
    endsAt: '03:30',
    endDayOffset: 0,
  };
  const nonexistentEnd = { ...overnight, startsAt: '01:30', endsAt: '02:30', endDayOffset: 0 };
  assert.equal(
    resolveShiftInterval('2026-03-08', nonexistentStart, 'America/New_York').reason,
    'NONEXISTENT_START',
  );
  assert.equal(
    resolveShiftInterval('2026-03-08', nonexistentEnd, 'America/New_York').reason,
    'NONEXISTENT_END',
  );
});

test('skipped civil day is detected rather than inventing a time', () => {
  assert.deepEqual(possibleUtcInstants('2011-12-30', '09:00', 'Pacific/Apia'), []);
});

test('24-hour wall-clock shifts may have 23 or 25 actual hours', () => {
  const fullDay = { ...overnight, startsAt: '07:00', endsAt: '07:00', endDayOffset: 1 };
  const spring = resolveShiftInterval('2026-03-07', fullDay, 'America/New_York');
  const fall = resolveShiftInterval('2026-10-31', fullDay, 'America/New_York');
  assert.equal(spring.status, 'resolved');
  assert.equal(fall.status, 'resolved');
  assert.equal(spring.elapsedSeconds, 23 * 3600);
  assert.equal(fall.elapsedSeconds, 25 * 3600);
  assert.equal(spring.wallMinutes, 1440);
});

test('rest days return zero, no inferred payable minutes', () => {
  assert.deepEqual(resolveShiftInterval('2026-11-01', DEFAULT_TEMPLATES[3], 'UTC'), {
    status: 'rest',
    wallMinutes: 0,
    elapsedSeconds: 0,
  });
});

test('invalid local clock, date, IANA timezone and policies are rejected', () => {
  assert.throws(() => possibleUtcInstants('2026-02-29', '08:00', 'UTC'), /INVALID_DATE/);
  assert.throws(() => possibleUtcInstants('2026-01-01', '24:00', 'UTC'), /INVALID_SHIFT_TIME/);
  assert.throws(
    () => possibleUtcInstants('2026-01-01', '08:00', '+03:00'),
    /INVALID_TIME_ZONE/,
  );
  assert.throws(
    () => possibleUtcInstants('2026-01-01', '08:00', 'Not_A_Real/Zone'),
    /INVALID_TIME_ZONE/,
  );
  assert.throws(
    () => resolveLocalBoundary('2026-01-01', '08:00', 'UTC', 'unknown'),
    /INVALID_FOLD_POLICY/,
  );
});

test('UTC interval is independent of host timezone and day-year boundaries', () => {
  const shift = { ...overnight, startsAt: '23:00', endsAt: '07:00', endDayOffset: 1 };
  const result = resolveShiftInterval('2026-12-31', shift, 'UTC');
  assert.equal(result.status, 'resolved');
  assert.equal(result.startInstantUtc, '2026-12-31T23:00:00.000Z');
  assert.equal(result.endInstantUtc, '2027-01-01T07:00:00.000Z');
  assert.equal(result.elapsedSeconds, 28800);
  assert.equal(elapsedLabel(result.elapsedSeconds), '8h 00m');
});

test('elapsedLabel refuses invalid durations', () => {
  assert.throws(() => elapsedLabel(-1), /INVALID_ELAPSED_SECONDS/);
  assert.throws(() => elapsedLabel(2.5), /INVALID_ELAPSED_SECONDS/);
  assert.equal(elapsedLabel(3661), '1h 01m 1s');
});
