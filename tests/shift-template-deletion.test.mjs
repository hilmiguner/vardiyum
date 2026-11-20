import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_TEMPLATES } from '../src/domain/shift-engine.ts';
import { assertRemovableShiftTemplate } from '../src/domain/shift-template-deletion.ts';

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

test('unused user-created shift and built-in default types are equally removable', () => {
  for (const id of ['custom_123', 'morning', 'evening', 'night', 'off']) {
    assert.doesNotThrow(() =>
      assertRemovableShiftTemplate(id, templates, ['custom_123' === id ? 'off' : 'custom_123'], {}),
    );
  }
});

test('unknown shift template ids are rejected', () => {
  assert.throws(
    () => assertRemovableShiftTemplate('custom_missing', templates, ['off'], {}),
    /SHIFT_TEMPLATE_NOT_FOUND/,
  );
});

test('current cycle use or day override prevents deleting custom and default types', () => {
  for (const id of ['morning', 'off', custom.id]) {
    assert.throws(
      () => assertRemovableShiftTemplate(id, templates, [id], {}),
      /SHIFT_TEMPLATE_IN_USE/,
    );
    assert.throws(
      () =>
        assertRemovableShiftTemplate(id, templates, ['evening'], {
          '2026-11-16': { date: '2026-11-16', shiftId: id, note: '' },
        }),
      /SHIFT_TEMPLATE_IN_USE/,
    );
  }
});

test('the last remaining built-in or custom template cannot be deleted', () => {
  for (const template of [DEFAULT_TEMPLATES[0], custom]) {
    assert.throws(
      () => assertRemovableShiftTemplate(template.id, [template], [], {}),
      /CANNOT_REMOVE_LAST_SHIFT/,
    );
  }
});
