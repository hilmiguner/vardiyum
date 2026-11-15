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
  const timeZone = row?.timezone_id ||
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
    byDate[entry.date] = { date: entry.date, shiftId: entry.shift_code, note: entry.note ?? '' };
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
): Promise<void> {
  const { pattern, templates } = validateScheduleConfig(patternInput, templateInput);
  const db = await getDatabase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await db.withExclusiveTransactionAsync(async (tx) => {
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
        entry.id, entry.name, entry.color, entry.startsAt, entry.endsAt,
        entry.endDayOffset, entry.breakMinutes, entry.isRestDay ? 1 : 0,
      );
    }
    await tx.runAsync(
      `INSERT INTO shift_patterns (id, anchor_date, timezone_id)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         anchor_date = excluded.anchor_date,
         updated_at = CURRENT_TIMESTAMP`,
      PRIMARY_ID, pattern.anchorDate, timeZone,
    );
    await tx.runAsync('DELETE FROM pattern_days WHERE pattern_id = ?', PRIMARY_ID);
    for (const [index, shiftId] of pattern.days.entries()) {
      await tx.runAsync(
        'INSERT INTO pattern_days (pattern_id, day_index, shift_code) VALUES (?, ?, ?)',
        PRIMARY_ID, index, shiftId,
      );
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
    override.date, override.shiftId, override.note,
  );
}
