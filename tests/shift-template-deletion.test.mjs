import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_TEMPLATES } from '../src/domain/shift-engine.ts';
import { assertRemovableCustomTemplate } from '../src/domain/shift-template-deletion.ts';

const custom = {
  id: 'custom_123',
  name: 'Extra',
  color: '#56A3FF',
  startsAt: '08:00',
  endsAt: '16:00',
  endDayOffset: 0,
  breakMinutes: 0,
  isRestDay: false,
};
const templates = [...DEFAULT_TEMPLATES, custom];

test('unused user-created shift can be removed from a draft', () => {
  assert.doesNotThrow(() =>
    assertRemovableCustomTemplate(custom.id, templates, ['morning', 'off'], {}),
  );
});

test('built-in defaults are protected and unknown template ids fail closed', () => {
  assert.throws(
    () => assertRemovableCustomTemplate('morning', templates, ['off'], {}),
    /DEFAULT_SHIFT_CANNOT_BE_REMOVED/,
  );
  assert.throws(
    () => assertRemovableCustomTemplate('custom_missing', templates, ['off'], {}),
    /SHIFT_TEMPLATE_NOT_FOUND/,
  );
});

test('removal requires replacing every cycle use and date override first', () => {
  assert.throws(
    () => assertRemovableCustomTemplate(custom.id, templates, ['custom_123'], {}),
    /SHIFT_TEMPLATE_IN_USE/,
  );
  assert.throws(
    () =>
      assertRemovableCustomTemplate(custom.id, templates, ['morning'], {
        '2026-11-16': { date: '2026-11-16', shiftId: custom.id, note: '' },
      }),
    /SHIFT_TEMPLATE_IN_USE/,
  );
});

test('a schedule cannot lose its last user-created template', () => {
  assert.throws(
    () => assertRemovableCustomTemplate(custom.id, [custom], ['morning'], {}),
    /CANNOT_REMOVE_LAST_SHIFT/,
  );
});
