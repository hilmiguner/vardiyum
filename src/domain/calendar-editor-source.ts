import type { ShiftTemplate } from './shift-engine.ts';

/**
 * Calendar editor drafts belong to the exact selected planned shift source.
 * React must remount draft-based editors when a same-day override, an edited
 * template's hours/breaks or the schedule's IANA zone changes. Otherwise a
 * form can show the new shift heading but still submit the OLD shift's clocks.
 *
 * The ID alone is insufficient: settings may update the same template in
 * place. JSON tuple avoids delimiter collisions in IDs / time zone strings.
 * Historical recorded ACTUAL work is never rewritten by this identity.
 */
export function calendarEditorSourceKey(
  date: string,
  template: Pick<
    ShiftTemplate,
    | 'id'
    | 'startsAt'
    | 'endsAt'
    | 'endDayOffset'
    | 'breakMinutes'
    | 'isRestDay'
  >,
  scheduleTimeZone: string,
): string {
  return JSON.stringify([
    date,
    scheduleTimeZone,
    template.id,
    template.startsAt,
    template.endsAt,
    template.endDayOffset,
    template.breakMinutes,
    template.isRestDay,
  ]);
}
