/**
 * Versioned SQLite schema. Static SQL only: never interpolate user-controlled data.
 * Schema versions are tracked by PRAGMA user_version.
 */
export const SCHEMA_VERSION = 6;

export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS shift_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  starts_at_local TEXT,
  ends_at_local TEXT,
  end_day_offset INTEGER NOT NULL DEFAULT 0,
  is_rest_day INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS shift_patterns (
  id TEXT PRIMARY KEY NOT NULL,
  anchor_date TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pattern_days (
  pattern_id TEXT NOT NULL REFERENCES shift_patterns(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK(day_index >= 0),
  shift_code TEXT NOT NULL,
  PRIMARY KEY (pattern_id, day_index)
);
CREATE TABLE IF NOT EXISTS day_overrides (
  date TEXT PRIMARY KEY NOT NULL,
  shift_code TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS routine_rules (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  recurrence_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS task_completions (
  routine_id TEXT NOT NULL REFERENCES routine_rules(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY(routine_id, local_date)
);
CREATE TABLE IF NOT EXISTS work_entries (
  id TEXT PRIMARY KEY NOT NULL,
  local_date TEXT NOT NULL,
  actual_start TEXT,
  actual_end TEXT,
  worked_minutes INTEGER NOT NULL DEFAULT 0 CHECK(worked_minutes >= 0),
  kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS compensation_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  effective_from TEXT NOT NULL,
  payment_model TEXT NOT NULL,
  currency TEXT NOT NULL,
  rate_minor_units INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pay_adjustments (
  id TEXT PRIMARY KEY NOT NULL,
  period_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_minor_units INTEGER NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries(local_date);
CREATE INDEX IF NOT EXISTS idx_completions_date ON task_completions(local_date);
PRAGMA user_version = 1;
`;

/**
 * V2 is additive: v1 rows and existing pattern references remain intact.
 * The four defaults are seeded only when their IDs do not already exist.
 */
export const MIGRATION_2_SQL = `
ALTER TABLE shift_templates ADD COLUMN break_minutes INTEGER NOT NULL DEFAULT 0
  CHECK(break_minutes >= 0);
INSERT OR IGNORE INTO shift_templates (id, name, color, starts_at_local, ends_at_local, end_day_offset, is_rest_day, break_minutes)
VALUES
  ('morning', 'Sabah', '#56A3FF', '07:00', '15:00', 0, 0, 0),
  ('evening', 'Akşam', '#E8A86E', '15:00', '23:00', 0, 0, 0),
  ('night', 'Gece', '#A18CF6', '23:00', '07:00', 1, 0, 0),
  ('off', 'İzin', '#5EC59C', NULL, NULL, 0, 1, 0);
PRAGMA user_version = 2;
`;

/**
 * V3 is additive and never changes existing v1/v2 pattern or work_entries.
 * An old work_entries row is not silently promoted to a verified actual session.
 */
export const MIGRATION_3_SQL = `
CREATE TABLE IF NOT EXISTS shift_boundary_choices (
  local_date TEXT PRIMARY KEY NOT NULL,
  schedule_signature TEXT NOT NULL,
  start_choice TEXT NOT NULL CHECK(start_choice IN ('reject', 'earlier', 'later')),
  end_choice TEXT NOT NULL CHECK(end_choice IN ('reject', 'earlier', 'later')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS actual_work_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  local_date TEXT NOT NULL,
  start_clock TEXT NOT NULL,
  end_date TEXT NOT NULL,
  end_clock TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  start_choice TEXT NOT NULL CHECK(start_choice IN ('reject','earlier','later')),
  end_choice TEXT NOT NULL CHECK(end_choice IN ('reject','earlier','later')),
  start_instant_utc TEXT NOT NULL,
  end_instant_utc TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK(break_minutes >= 0),
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user_entered' CHECK(source = 'user_entered'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(end_instant_utc > start_instant_utc)
);
CREATE INDEX IF NOT EXISTS idx_actual_work_date ON actual_work_sessions(local_date);
CREATE INDEX IF NOT EXISTS idx_actual_work_interval ON actual_work_sessions(start_instant_utc, end_instant_utc);
PRAGMA user_version = 3;
`;

/**
 * V4 augments existing v1 routine tables WITHOUT dropping rows or cascading
 * completion deletion. Routine removal is soft-archive; audit is append-only.
 * Historical completions are backfilled once into an independent event log.
 */
export const MIGRATION_4_SQL = `
ALTER TABLE routine_rules ADD COLUMN archived_at TEXT;
ALTER TABLE routine_rules ADD COLUMN revision INTEGER NOT NULL DEFAULT 1
  CHECK(revision >= 1);
CREATE INDEX IF NOT EXISTS idx_routine_active
  ON routine_rules(archived_at, enabled);
CREATE TABLE IF NOT EXISTS routine_completion_events (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('completed','uncompleted')),
  title_snapshot TEXT NOT NULL,
  recurrence_snapshot TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_routine_events_date
  ON routine_completion_events(local_date, occurred_at, id);
INSERT OR IGNORE INTO routine_completion_events
  (id, routine_id, local_date, action, title_snapshot, recurrence_snapshot, occurred_at)
SELECT 'legacy:' || c.routine_id || ':' || c.local_date,
  c.routine_id, c.local_date, 'completed', r.title, r.recurrence_json, c.completed_at
FROM task_completions c
JOIN routine_rules r ON r.id = c.routine_id;
PRAGMA user_version = 4;
`;

/**
 * V5 stores optional reminder settings on the existing routine rule.
 * No permission is requested by migration. Consent is an app_settings row
 * written only after an explicit user action.
 */
export const MIGRATION_5_SQL = `
ALTER TABLE routine_rules ADD COLUMN reminder_clock TEXT
  CHECK(reminder_clock IS NULL OR (
    length(reminder_clock) = 5 AND substr(reminder_clock, 3, 1) = ':'
    AND substr(reminder_clock, 1, 2) BETWEEN '00' AND '23'
    AND substr(reminder_clock, 4, 2) BETWEEN '00' AND '59'
  ));
ALTER TABLE routine_rules ADD COLUMN reminder_timezone_id TEXT;
CREATE INDEX IF NOT EXISTS idx_routine_reminder_clock
  ON routine_rules(reminder_clock, archived_at, enabled);
PRAGMA user_version = 5;
`;
/**
 * V6 introduces independent, immutable effective-month pay profiles and
 * append-only user-entered adjustments. Legacy compensation_profiles,
 * pay_adjustments and work_entries are never promoted into trusted payroll.
 */
export const MIGRATION_6_SQL = `
CREATE TABLE IF NOT EXISTS earnings_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  effective_from TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL CHECK(model IN ('hourly','monthly_fixed')),
  currency TEXT NOT NULL CHECK(currency IN ('TRY','USD','EUR','GBP')),
  base_minor_units INTEGER NOT NULL CHECK(base_minor_units > 0),
  overtime_hourly_minor_units INTEGER NOT NULL DEFAULT 0
    CHECK(overtime_hourly_minor_units >= 0),
  overtime_after_minutes INTEGER,
  overtime_multiplier_numerator INTEGER NOT NULL DEFAULT 1,
  overtime_multiplier_denominator INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0),
  source TEXT NOT NULL DEFAULT 'user_entered' CHECK(source = 'user_entered'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(overtime_after_minutes IS NULL OR
    (overtime_after_minutes >= 0 AND overtime_after_minutes <= 44640)),
  CHECK(overtime_multiplier_numerator >= overtime_multiplier_denominator
    AND overtime_multiplier_denominator > 0),
  CHECK(overtime_after_minutes IS NULL OR model != 'monthly_fixed' OR
    overtime_hourly_minor_units > 0)
);
CREATE TABLE IF NOT EXISTS earnings_adjustments (
  id TEXT PRIMARY KEY NOT NULL,
  period_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('bonus','deduction','correction')),
  currency TEXT NOT NULL CHECK(currency IN ('TRY','USD','EUR','GBP')),
  amount_minor_units INTEGER NOT NULL CHECK(amount_minor_units != 0),
  note TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user_entered' CHECK(source = 'user_entered'),
  created_at TEXT NOT NULL,
  CHECK(kind != 'bonus' OR amount_minor_units > 0),
  CHECK(kind != 'deduction' OR amount_minor_units < 0)
);
CREATE INDEX IF NOT EXISTS idx_earnings_profiles_effective
  ON earnings_profiles(effective_from);
CREATE INDEX IF NOT EXISTS idx_earnings_adjustments_period
  ON earnings_adjustments(period_key, created_at, id);
PRAGMA user_version = 6;
`;
