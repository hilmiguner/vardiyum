import assert from 'node:assert/strict';
import test from 'node:test';

import { calendarEditorSourceKey } from '../src/domain/calendar-editor-source.ts';
import {
  DEFAULT_TEMPLATES,
  resolveShift,
  validateOverride,
} from '../src/domain/shift-engine.ts';

const DATE = '2026-11-16';
const ZONE = 'Europe/Istanbul';
const schedule = {
  pattern: { anchorDate: DATE, days: ['night', 'off'] },
  templates: [...DEFAULT_TEMPLATES],
  overrides: {},
  timeZone: ZONE,
};

function source(date, nextSchedule) {
  const selected = resolveShift(date, nextSchedule);
  assert.ok(selected);
  return calendarEditorSourceKey(date, selected.template, nextSchedule.timeZone);
}

test('P0: same civil date changing night to morning resets work editor clocks and end date', () => {
  const before = source(DATE, schedule);
  const override = validateOverride(DATE, 'morning', 'Cover earlier shift', schedule.templates);
  const adjusted = {
    ...schedule,
    overrides: { [DATE]: override },
  };
  assert.notEqual(source(DATE, adjusted), before);
  assert.equal(resolveShift(DATE, schedule).template.startsAt, '23:00');
  assert.equal(resolveShift(DATE, schedule).template.endDayOffset, 1);
  assert.equal(resolveShift(DATE, adjusted).template.startsAt, '07:00');
  assert.equal(resolveShift(DATE, adjusted).template.endDayOffset, 0);
  assert.equal(source(DATE, schedule), before, 'undo restores original source identity');
});

test('P0: editing the SAME shift template ID still resets stale draft clocks and break defaults', () => {
  const previous = source(DATE, schedule);
  const modifiedClock = {
    ...schedule,
    templates: schedule.templates.map((x) =>
      x.id === 'night' ? { ...x, startsAt: '22:00' } : x,
    ),
  };
  assert.notEqual(source(DATE, modifiedClock), previous);
  const modifiedBreak = {
    ...schedule,
    templates: schedule.templates.map((x) =>
      x.id === 'night' ? { ...x, breakMinutes: x.breakMinutes + 15 } : x,
    ),
  };
  assert.notEqual(source(DATE, modifiedBreak), previous);
  assert.notEqual(source(DATE, modifiedBreak), source(DATE, modifiedClock));
});

test('P0: changing selected day, IANA zone or rest-day source remounts the draft editor', () => {
  const previous = source(DATE, schedule);
  assert.notEqual(source('2026-11-17', schedule), previous);
  assert.notEqual(source(DATE, { ...schedule, timeZone: 'Asia/Kathmandu' }), previous);
  assert.notEqual(
    source(DATE, {
      ...schedule,
      overrides: { [DATE]: validateOverride(DATE, 'off', '', schedule.templates) },
    }),
    previous,
  );
});

test('identity has unambiguous tuple fields for clock/break/source/zone with no unsafe string splitting', () => {
  const night = resolveShift(DATE, schedule).template;
  const key = calendarEditorSourceKey(DATE, night, ZONE);
  assert.deepEqual(JSON.parse(key), [
    DATE,
    ZONE,
    night.id,
    night.startsAt,
    night.endsAt,
    night.endDayOffset,
    night.breakMinutes,
    night.isRestDay,
  ]);
  assert.equal(calendarEditorSourceKey(DATE, night, ZONE), key);
});
