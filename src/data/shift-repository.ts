import { getDatabase } from './database';
import {
  DEFAULT_TEMPLATES,
  type DayOverride,
  type ShiftPattern,
  type ShiftSchedule,
  type ShiftTemplate,
  validateOverride,
  validateScheduleConfig,
} from '../domain/shift-engine';

const PRIMARY_ID = 'primary';

interface PatternRow {
  anchor_date: string;
  timezone_id: string;
}
interface DayRow {
  day_index: number;
  shift_code: string;
}
interface TemplateRow {
  id: string;
  name: string;
  color: string;
  starts_at_local: string | null;
  ends_at_local: string | null;
  end_day_offset: number;
  break_minutes: number;
  is_rest_day: number;
}
interface OverrideRow {
  date: string;
  shift_code: string;
  note: string | null;
}

export async function loadSchedule(): Promise<ShiftSchedule> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PatternRow>(
    'SELECT anchor_date, timezone_id FROM shift_patterns WHERE id = ?',
    PRIMARY_ID,
  );
  const templates = await db.getAllAsync<TemplateRow>(
    'SELECT * FROM shift_templates ORDER BY id',
  );
  const overrides = await db.getAllAsync<OverrideRow>(
    'SELECT date, shift_code, note FROM day_overrides',
  );
  const stored: ShiftTemplate[] = templates.map((entry) => ({
    id: entry.id,
    name: entry.name,
    color: entry.color,
    startsAt: entry.starts_at_local,
    endsAt: entry.ends_at_local,
    endDayOffset: entry.end_day_offset as 0 | 1,
    breakMinutes: entry.break_minutes,
    isRestDay: entry.is_rest_day === 1,
  }));
  const timeZone =
    row?.timezone_id || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let pattern: ShiftPattern | null = null;
  if (row) {
    const days = await db.getAllAsync<DayRow>(
      'SELECT day_index, shift_code FROM pattern_days WHERE pattern_id = ? ORDER BY day_index',
      PRIMARY_ID,
    );
    pattern = { anchorDate: row.anchor_date, days: days.map((entry) => entry.shift_code) };
    validateScheduleConfig(pattern, stored);
  }
  const byDate: Record<string, DayOverride> = {};
  for (const entry of overrides) {
    byDate[entry.date] = {
      date: entry.date,
      shiftId: entry.shift_code,
      note: entry.note ?? '',
    };
  }
  return {
    pattern,
    templates: stored.length > 0 ? stored : [...DEFAULT_TEMPLATES],
    overrides: byDate,
    timeZone,
  };
}

/** Only replaces the pattern and supplied templates; overrides remain unchanged. */
export async function saveScheduleConfig(
  patternInput: ShiftPattern,
  templateInput: readonly ShiftTemplate[],
  removedTemplateIds: readonly string[] = [],
): Promise<void> {
  const { pattern, templates } = validateScheduleConfig(patternInput, templateInput);
  const db = await getDatabase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getAllAsync<{ id: string }>('SELECT id FROM shift_templates');
    const nextIds = new Set(templates.map((item) => item.id));
    const removedIds = new Set(removedTemplateIds);
    for (const { id } of existing) {
      if (!nextIds.has(id) && !removedIds.has(id)) throw new Error('STALE_SHIFT_TEMPLATE_LIST');
    }
    for (const id of removedIds) {
      if (
        !id.startsWith('custom_') ||
        nextIds.has(id) ||
        !existing.some((item) => item.id === id)
      )
        throw new Error('INVALID_SHIFT_TEMPLATE_REMOVAL');
      const override = await tx.getFirstAsync<{ date: string }>(
        'SELECT date FROM day_overrides WHERE shift_code = ? LIMIT 1',
        id,
      );
      if (override) throw new Error('SHIFT_TEMPLATE_IN_USE');
    }
    if (removedIds.size) {
      const routineRows = await tx.getAllAsync<{ recurrence_json: string }>(
        'SELECT recurrence_json FROM routine_rules',
      );
      for (const row of routineRows) {
        let recurrence: { shiftIds?: unknown };
        try {
          recurrence = JSON.parse(row.recurrence_json) as { shiftIds?: unknown };
        } catch {
          throw new Error('INVALID_STORED_RECURRENCE');
        }
        if (!Array.isArray(recurrence.shiftIds)) throw new Error('INVALID_STORED_RECURRENCE');
        if (recurrence.shiftIds.some((id) => removedIds.has(id)))
          throw new Error('SHIFT_USED_BY_ROUTINE');
      }
    }
    for (const entry of templates) {
      await tx.runAsync(
        `INSERT INTO shift_templates (
          id, name, color, starts_at_local, ends_at_local,
          end_day_offset, break_minutes, is_rest_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, color = excluded.color,
          starts_at_local = excluded.starts_at_local,
          ends_at_local = excluded.ends_at_local,
          end_day_offset = excluded.end_day_offset,
          break_minutes = excluded.break_minutes,
          is_rest_day = excluded.is_rest_day`,
        entry.id,
        entry.name,
        entry.color,
        entry.startsAt,
        entry.endsAt,
        entry.endDayOffset,
        entry.breakMinutes,
        entry.isRestDay ? 1 : 0,
      );
    }
    await tx.runAsync(
      `INSERT INTO shift_patterns (id, anchor_date, timezone_id)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         anchor_date = excluded.anchor_date,
         updated_at = CURRENT_TIMESTAMP`,
      PRIMARY_ID,
      pattern.anchorDate,
      timeZone,
    );
    await tx.runAsync('DELETE FROM pattern_days WHERE pattern_id = ?', PRIMARY_ID);
    for (const [index, shiftId] of pattern.days.entries()) {
      await tx.runAsync(
        'INSERT INTO pattern_days (pattern_id, day_index, shift_code) VALUES (?, ?, ?)',
        PRIMARY_ID,
        index,
        shiftId,
      );
    }
    for (const id of removedIds) {
      const removed = await tx.runAsync('DELETE FROM shift_templates WHERE id = ?', id);
      if (removed.changes !== 1) throw new Error('SHIFT_TEMPLATE_NOT_FOUND');
    }
  });
}

export async function saveDayOverride(
  date: string,
  shiftId: string | null,
  note: string,
  templates: readonly ShiftTemplate[],
): Promise<void> {
  const db = await getDatabase();
  if (shiftId === null) {
    await db.runAsync('DELETE FROM day_overrides WHERE date = ?', date);
    return;
  }
  const override = validateOverride(date, shiftId, note, templates);
  await db.runAsync(
    `INSERT INTO day_overrides(date, shift_code, note) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       shift_code = excluded.shift_code,
       note = excluded.note`,
    override.date,
    override.shiftId,
    override.note,
  );
}

/**
 * Changes the interpretation of local shift times for the entire repeating
 * schedule only after explicit user confirmation. Historical actual UTC work
 * sessions remain immutable; old fold policies fail signature validation.
 */
export async function changeScheduleTimeZone(nextTimeZone: string): Promise<void> {
  // Reject non-IANA strings and unsupported time zones before touching SQLite.
  if (!new RegExp('^[A-Za-z][A-Za-z0-9_.+-]*(?:/[A-Za-z0-9_.+-]+)*$').test(nextTimeZone))
    throw new Error('INVALID_TIME_ZONE');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: nextTimeZone }).format(new Date());
  } catch {
    throw new Error('INVALID_TIME_ZONE');
  }
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const result = await tx.runAsync(
      'UPDATE shift_patterns SET timezone_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      nextTimeZone,
      PRIMARY_ID,
    );
    if (result.changes !== 1) throw new Error('SCHEDULE_NOT_CONFIGURED');
    // Keep each configured reminder bound to the schedule zone after the user's
    // explicit zone-change confirmation. The changed revision invalidates
    // pending OS notification keys so the coordinator can replace them.
    await tx.runAsync(
      `UPDATE routine_rules
       SET reminder_timezone_id = ?, revision = revision + 1
       WHERE reminder_clock IS NOT NULL AND archived_at IS NULL`,
      nextTimeZone,
    );
  });
}
