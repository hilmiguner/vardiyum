/**
 * Versioned SQLite schema. Static SQL only: never interpolate user-controlled data.
 * Schema versions are tracked by PRAGMA user_version.
 */
export const SCHEMA_VERSION = 1;

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
