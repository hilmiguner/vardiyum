import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_TEMPLATES,
  addCalendarDays,
  calendarDateInZone,
  moveMonth,
  plannedWallMinutes,
  resolveShift,
  validateOverride,
  validateScheduleConfig,
  validateTemplate,
} from '../src/domain/shift-engine.ts';

const custom = {
  id: 'custom_12',
  name: '12 saat',
  color: '#20A0F0',
  startsAt: '19:00',
  endsAt: '07:00',
  endDayOffset: 1,
  breakMinutes: 30,
  isRestDay: false,
};
const pattern = { anchorDate: '2026-11-15', days: ['custom_12', 'off', 'off'] };
const templates = [...DEFAULT_TEMPLATES, custom];

test('custom overnight shifts have wall-clock duration and account for breaks', () => {
  assert.equal(plannedWallMinutes(custom), 720);
  assert.equal(plannedWallMinutes(validateTemplate(custom)) - custom.breakMinutes, 690);
  assert.equal(plannedWallMinutes(DEFAULT_TEMPLATES[2]), 480);
});

test('24-hour interval is allowed and invalid durations are rejected', () => {
  const day = { ...custom, startsAt: '07:00', endsAt: '07:00', endDayOffset: 1 };
  assert.equal(plannedWallMinutes(validateTemplate(day)), 1440);
  assert.throws(() => validateTemplate({ ...custom, endsAt: '25:00' }), /INVALID_SHIFT_TIME/);
  assert.throws(
    () => validateTemplate({ ...custom, endDayOffset: 0 }),
    /INVALID_SHIFT_DURATION/,
  );
  assert.throws(
    () => validateTemplate({ ...custom, breakMinutes: 720 }),
    /INVALID_SHIFT_DURATION/,
  );
  assert.throws(() => validateTemplate({ ...custom, name: ' ' }), /INVALID_SHIFT_NAME/);
  assert.throws(
    () => validateTemplate({ ...DEFAULT_TEMPLATES[3], startsAt: '10:00' }),
    /INVALID_REST_SHIFT/,
  );
});

test('validates custom IDs, duplicates and references to unknown templates', () => {
  assert.equal(validateScheduleConfig(pattern, templates).pattern.days.length, 3);
  assert.throws(
    () =>
      validateScheduleConfig({ anchorDate: pattern.anchorDate, days: ['unknown'] }, templates),
    /UNKNOWN_SHIFT/,
  );
  assert.throws(
    () => validateScheduleConfig(pattern, [...templates, custom]),
    /DUPLICATE_SHIFT_ID/,
  );
  assert.throws(
    () => validateScheduleConfig({ ...pattern, days: ['invalid id!'] }, templates),
    /INVALID_SHIFT/,
  );
});

test('one-day overrides never shift the underlying cycle', () => {
  const schedule = {
    pattern,
    templates,
    overrides: {},
    timeZone: 'Europe/Istanbul',
  };
  const next = addCalendarDays(pattern.anchorDate, 1);
  const after = addCalendarDays(pattern.anchorDate, 3);
  assert.equal(resolveShift(pattern.anchorDate, schedule)?.template.id, 'custom_12');
  assert.equal(resolveShift(next, schedule)?.template.id, 'off');
  const edit = validateOverride(next, 'custom_12', '  extra day ', templates);
  assert.deepEqual(edit, { date: next, shiftId: 'custom_12', note: 'extra day' });
  const changed = { ...schedule, overrides: { [next]: edit } };
  assert.equal(resolveShift(next, changed)?.source, 'override');
  assert.equal(resolveShift(next, changed)?.template.id, 'custom_12');
  assert.equal(resolveShift(after, changed)?.template.id, 'custom_12');
  assert.equal(resolveShift(after, changed)?.source, 'cycle');
  assert.throws(() => validateOverride(next, 'unknown', '', templates), /UNKNOWN_SHIFT/);
});

test('month navigation and timezone calendar dates remain civil dates', () => {
  assert.equal(moveMonth('2026-12-01', 1), '2027-01-01');
  assert.equal(moveMonth('2027-01-01', -1), '2026-12-01');
  assert.throws(() => moveMonth('2026-12-15', 1), /INVALID_MONTH/);
  assert.equal(
    calendarDateInZone('America/New_York', new Date('2026-03-08T02:30:00Z')),
    '2026-03-07',
  );
  assert.equal(
    calendarDateInZone('Europe/Istanbul', new Date('2026-03-08T02:30:00Z')),
    '2026-03-08',
  );
});
