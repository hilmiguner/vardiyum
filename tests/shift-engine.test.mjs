import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCalendarDays,
  calendarOrdinal,
  cycleIndex,
  scheduledShift,
  validatePattern,
} from '../src/domain/shift-engine.ts';

const pattern = {
  anchorDate: '2026-11-15',
  days: ['morning', 'morning', 'evening', 'evening', 'night', 'night', 'off', 'off'],
};

test('a shift cycle repeats at its configured length', () => {
  assert.equal(scheduledShift('2026-11-15', pattern), 'morning');
  assert.equal(scheduledShift('2026-11-21', pattern), 'off');
  assert.equal(scheduledShift('2026-11-23', pattern), 'morning');
});
test('dates before anchor use positive modulo', () => {
  assert.equal(cycleIndex('2026-11-14', pattern), 7);
  assert.equal(scheduledShift('2026-11-14', pattern), 'off');
});
test('calendar arithmetic handles leap years and year boundaries', () => {
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addCalendarDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addCalendarDays('2027-01-01', -1), '2026-12-31');
});
test('DST does not affect ordinal difference', () => {
  assert.equal(calendarOrdinal('2026-03-30') - calendarOrdinal('2026-03-29'), 1);
  assert.equal(calendarOrdinal('2026-10-26') - calendarOrdinal('2026-10-25'), 1);
});
test('invalid values are rejected', () => {
  assert.throws(() => calendarOrdinal('2026-02-29'), /INVALID_DATE/);
  assert.throws(() => calendarOrdinal('2026-1-2'), /INVALID_DATE/);
  assert.throws(
    () => validatePattern({ anchorDate: '2026-11-15', days: [] }),
    /INVALID_PATTERN_LENGTH/,
  );
  assert.throws(
    () => scheduledShift('2026-11-15', { anchorDate: '2026-11-15', days: [] }),
    /EMPTY_PATTERN/,
  );
});
