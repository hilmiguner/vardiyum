import type { DayOverride } from './shift-engine.ts';

/**
 * Built-in and user-created templates have identical deletion semantics.
 * Deletion is blocked while referenced by the editable cycle or saved day
 * overrides. The SQLite transaction additionally guards routine references
 * (including archived rules), preserving audit and actual-work records.
 */
export function assertRemovableShiftTemplate(
  id: string,
  templates: readonly { id: string }[],
  cycleDays: readonly string[],
  overrides: Readonly<Record<string, DayOverride>>,
): void {
  if (!templates.some((template) => template.id === id))
    throw new Error('SHIFT_TEMPLATE_NOT_FOUND');
  if (templates.length <= 1) throw new Error('CANNOT_REMOVE_LAST_SHIFT');
  if (cycleDays.includes(id) || Object.values(overrides).some((item) => item.shiftId === id))
    throw new Error('SHIFT_TEMPLATE_IN_USE');
}
