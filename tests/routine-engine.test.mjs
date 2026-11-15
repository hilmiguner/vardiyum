import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVERY_DAY,
  routineMatchesDate,
  tasksForDate,
  validateRecurrence,
  validateRoutine,
} from '../src/domain/routine-engine.ts';
import { cycleIndex, DEFAULT_TEMPLATES } from '../src/domain/shift-engine.ts';

// Sunday anchor; arbitrary-length 8-day cycle (not a seven-day workweek).
const pattern = {
  anchorDate: '2026-11-15',
  days: ['morning', 'night', 'off', 'morning', 'night', 'off', 'off', 'evening'],
};
const schedule = {
  pattern,
  templates: [...DEFAULT_TEMPLATES],
  overrides: {},
  timeZone: 'America/New_York',
};
function rule(id, recurrence = EVERY_DAY, extras = {}) {
  return {
    id,
    title: 'Rule ' + id,
    recurrence: { ...recurrence },
    enabled: true,
    archivedAt: null,
    revision: 1,
    ...extras,
  };
}
test('every-day rule matches all civil dates, including across DST and year end', () => {
  const daily = rule('daily');
  assert.equal(routineMatchesDate(daily, '2026-11-15', schedule), true);
  assert.equal(routineMatchesDate(daily, '2027-01-01', schedule), true);
  assert.equal(routineMatchesDate(daily, '2026-11-01', schedule), true);
});

test('shift filters match resolved planned shift, not preceding or following midnight', () => {
  const nightOnly = rule('nightonly', { ...EVERY_DAY, shiftIds: ['night'] });
  assert.equal(routineMatchesDate(nightOnly, '2026-11-16', schedule), true);
  assert.equal(routineMatchesDate(nightOnly, '2026-11-17', schedule), false);
  const changed = {
    ...schedule,
    overrides: {
      '2026-11-16': { date: '2026-11-16', shiftId: 'off', note: 'changed' },
    },
  };
  assert.equal(routineMatchesDate(nightOnly, '2026-11-16', changed), false);
  const restOnly = rule('restonly', { ...EVERY_DAY, restOnly: true });
  assert.equal(routineMatchesDate(restOnly, '2026-11-16', changed), true);
  assert.equal(routineMatchesDate(restOnly, '2026-11-17', schedule), true);
  assert.equal(routineMatchesDate(restOnly, '2026-11-15', schedule), false);
  assert.equal(cycleIndex('2026-11-16', pattern), 1);
});

test('weekday filter uses ISO Monday=1 Sunday=7; OR within dimension', () => {
  const sundayMonday = rule('weekends', { ...EVERY_DAY, weekdays: [7, 1] });
  assert.equal(routineMatchesDate(sundayMonday, '2026-11-15', schedule), true);
  assert.equal(routineMatchesDate(sundayMonday, '2026-11-16', schedule), true);
  assert.equal(routineMatchesDate(sundayMonday, '2026-11-17', schedule), false);
});

test('cycle positions remain 0-based, stable across 8+ day loops and preceding anchor', () => {
  const chosen = rule('cycle', { ...EVERY_DAY, cycleDays: [0, 7] });
  assert.equal(routineMatchesDate(chosen, '2026-11-15', schedule), true);
  assert.equal(routineMatchesDate(chosen, '2026-11-22', schedule), true);
  assert.equal(routineMatchesDate(chosen, '2026-11-23', schedule), true);
  assert.equal(routineMatchesDate(chosen, '2026-11-14', schedule), true);
  assert.equal(routineMatchesDate(chosen, '2026-11-16', schedule), false);
});

test('AND across dimensions, OR within one dimension, including off-day', () => {
  const combined = rule('combined', {
    version: 1,
    shiftIds: ['night', 'off'],
    weekdays: [1, 2],
    cycleDays: [1, 2],
    restOnly: false,
  });
  assert.equal(routineMatchesDate(combined, '2026-11-16', schedule), true);
  assert.equal(routineMatchesDate(combined, '2026-11-17', schedule), true);
  assert.equal(routineMatchesDate(combined, '2026-11-18', schedule), false);
  const offOnly = rule('offMonday', {
    ...combined.recurrence,
    restOnly: true,
  });
  assert.equal(routineMatchesDate(offOnly, '2026-11-16', schedule), false);
  assert.equal(routineMatchesDate(offOnly, '2026-11-17', schedule), true);
});

test('disabled or archived rules never show, but history can be stored separately', () => {
  const disabled = rule('disabled', EVERY_DAY, { enabled: false });
  const archived = rule('archived', EVERY_DAY, { archivedAt: '2026-11-15T12:00:00Z' });
  assert.equal(routineMatchesDate(disabled, '2026-11-15', schedule), false);
  assert.equal(routineMatchesDate(archived, '2026-11-15', schedule), false);
  assert.equal(
    routineMatchesDate(rule('daily'), '2026-11-15', { ...schedule, pattern: null }),
    false,
  );
});

test('completed checkboxes are keyed to immutable rule IDs, sorted by title', () => {
  const rules = [
    rule('z', EVERY_DAY, { title: 'Zebra' }),
    rule('a', EVERY_DAY, { title: 'Alpha' }),
    rule('arch', EVERY_DAY, { archivedAt: '2026-11-15T00:00:00Z' }),
  ];
  const items = tasksForDate(rules, '2026-11-15', schedule, new Set(['z']));
  assert.deepEqual(
    items.map((x) => [x.rule.id, x.completed]),
    [
      ['a', false],
      ['z', true],
    ],
  );
});

test('rules and selectors fail closed on invalid inputs', () => {
  assert.throws(() => validateRoutine(rule('bad id!')), /INVALID_ROUTINE_ID/);
  assert.throws(
    () => validateRoutine(rule('ok', EVERY_DAY, { title: '  ' })),
    /INVALID_ROUTINE_TITLE/,
  );
  assert.throws(
    () => validateRoutine(rule('ok', EVERY_DAY, { revision: 0 })),
    /INVALID_ROUTINE_REVISION/,
  );
  assert.throws(() => validateRecurrence({ ...EVERY_DAY, version: 2 }), /INVALID_RECURRENCE/);
  assert.throws(
    () => validateRecurrence({ ...EVERY_DAY, shiftIds: ['bad shift'] }),
    /INVALID_SHIFT_FILTER/,
  );
  assert.throws(() => validateRecurrence({ ...EVERY_DAY, weekdays: [0] }), /INVALID_WEEKDAY/);
  assert.throws(() => validateRecurrence({ ...EVERY_DAY, weekdays: [8] }), /INVALID_WEEKDAY/);
  assert.throws(
    () => validateRecurrence({ ...EVERY_DAY, cycleDays: [-1] }),
    /INVALID_CYCLE_DAY/,
  );
  assert.throws(
    () => validateRecurrence({ ...EVERY_DAY, restOnly: 'yes' }),
    /INVALID_RECURRENCE/,
  );
});

test('duplicate and unordered filter items canonicalize deterministically', () => {
  const recurrence = validateRecurrence({
    version: 1,
    shiftIds: ['night', 'morning', 'night'],
    weekdays: [7, 1, 7],
    cycleDays: [7, 1, 7],
    restOnly: false,
  });
  assert.deepEqual(recurrence.shiftIds, ['morning', 'night']);
  assert.deepEqual(recurrence.weekdays, [1, 7]);
  assert.deepEqual(recurrence.cycleDays, [1, 7]);
});
