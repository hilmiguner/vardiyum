import type { DayOverride } from './shift-engine.ts';

/**
 * Custom templates are removable only after the user removes all future
 * schedule references. Historical actual-work and routine snapshots are
 * immutable; their database-level references are checked on Save.
 */
export function assertRemovableCustomTemplate(
  id: string,
  templates: readonly { id: string }[],
  cycleDays: readonly string[],
  overrides: Readonly<Record<string, DayOverride>>,
): void {
  if (!id.startsWith('custom_')) throw new Error('DEFAULT_SHIFT_CANNOT_BE_REMOVED');
  if (!templates.some((template) => template.id === id))
    throw new Error('SHIFT_TEMPLATE_NOT_FOUND');
  if (templates.length <= 1) throw new Error('CANNOT_REMOVE_LAST_SHIFT');
  if (cycleDays.includes(id) || Object.values(overrides).some((item) => item.shiftId === id))
    throw new Error('SHIFT_TEMPLATE_IN_USE');
}
