import { getDatabase } from './database';
import { type ShiftCode, type ShiftPattern, validatePattern } from '../domain/shift-engine';

const PRIMARY_ID = 'primary';

interface PatternRow {
  anchor_date: string;
}
interface DayRow {
  day_index: number;
  shift_code: ShiftCode;
}

export async function loadShiftPattern(): Promise<ShiftPattern | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PatternRow>(
    'SELECT anchor_date FROM shift_patterns WHERE id = ?',
    PRIMARY_ID,
  );
  if (!row) return null;
  const dayRows = await db.getAllAsync<DayRow>(
    'SELECT day_index, shift_code FROM pattern_days WHERE pattern_id = ? ORDER BY day_index',
    PRIMARY_ID,
  );
  return validatePattern({ anchorDate: row.anchor_date, days: dayRows.map((r) => r.shift_code) });
}

export async function saveShiftPattern(input: ShiftPattern): Promise<void> {
  const value = validatePattern(input);
  const db = await getDatabase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO shift_patterns (id, anchor_date, timezone_id)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         anchor_date = excluded.anchor_date,
         timezone_id = excluded.timezone_id,
         updated_at = CURRENT_TIMESTAMP`,
      PRIMARY_ID,
      value.anchorDate,
      timeZone,
    );
    await tx.runAsync('DELETE FROM pattern_days WHERE pattern_id = ?', PRIMARY_ID);
    for (const [index, code] of value.days.entries()) {
      await tx.runAsync(
        'INSERT INTO pattern_days (pattern_id, day_index, shift_code) VALUES (?, ?, ?)',
        PRIMARY_ID,
        index,
        code,
      );
    }
  });
}
