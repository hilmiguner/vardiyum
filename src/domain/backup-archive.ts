/**
 * Offline encrypted backup interchange v1. This format intentionally has
 * NO database-restore operation: validation is read-only until a separately
 * reviewed, atomic restore strategy is implemented and native-tested.
 */
export const BACKUP_SCHEMA_VERSION = 8;
export const BACKUP_FORMAT = 'vardiyum-aes256gcm-v1';
export const BACKUP_SNAPSHOT_FORMAT = 'vardiyum-sqlite-snapshot-v1';
export const BACKUP_PAYLOAD_FORMAT = 'vardiyum-authenticated-payload-v1';
export const BACKUP_MAX_PLAINTEXT_CHARS = 4_000_000;
export const BACKUP_MAX_ENVELOPE_CHARS = 8_000_000;

export const BACKUP_TABLES = [
  'shift_templates',
  'shift_patterns',
  'pattern_days',
  'day_overrides',
  'routine_rules',
  'task_completions',
  'work_entries',
  'compensation_profiles',
  'pay_adjustments',
  'app_settings',
  'shift_boundary_choices',
  'actual_work_sessions',
  'routine_completion_events',
  'earnings_profiles',
  'earnings_adjustments',
  'earnings_month_break_allocations',
  'earnings_month_break_allocation_events',
  'earnings_profile_revisions',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];
export type BackupSqlValue = string | number | null;
export interface BackupTable {
  name: BackupTableName;
  columns: string[];
  rows: BackupSqlValue[][];
}
export interface BackupSnapshot {
  format: typeof BACKUP_SNAPSHOT_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  createdAt: string;
  tables: BackupTable[];
}
export interface BackupPreview {
  schemaVersion: number;
  createdAt: string;
  totalRows: number;
  tableCounts: { table: BackupTableName; count: number }[];
  /** Always false in this phase: no data is imported or overwritten. */
  canRestore: false;
}
export type ExpectedColumns = ReadonlyMap<BackupTableName, readonly string[]>;

const UTC_STAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SHA256 = /^[0-9a-f]{64}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const ID_COLUMN = /^[a-z][a-z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactFields(value: Record<string, unknown>, names: readonly string[], code: string) {
  const actual = Object.keys(value);
  if (actual.length !== names.length || names.some((key) => !Object.hasOwn(value, key)))
    throw new Error(code);
}
function dateStamp(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_STAMP.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function validateBackupSnapshot(
  input: unknown,
  expectedColumns: ExpectedColumns,
): BackupSnapshot {
  if (!isRecord(input)) throw new Error('BACKUP_INVALID_SNAPSHOT');
  exactFields(
    input,
    ['format', 'schemaVersion', 'createdAt', 'tables'],
    'BACKUP_INVALID_SNAPSHOT',
  );
  if (input.format !== BACKUP_SNAPSHOT_FORMAT || input.schemaVersion !== BACKUP_SCHEMA_VERSION)
    throw new Error('BACKUP_UNSUPPORTED_SCHEMA');
  if (!dateStamp(input.createdAt)) throw new Error('BACKUP_INVALID_TIMESTAMP');
  if (!Array.isArray(input.tables) || input.tables.length !== BACKUP_TABLES.length)
    throw new Error('BACKUP_INCOMPLETE_TABLES');
  let totalRows = 0;
  for (let index = 0; index < BACKUP_TABLES.length; index++) {
    const entry: unknown = input.tables[index];
    if (!isRecord(entry)) throw new Error('BACKUP_INVALID_TABLE');
    exactFields(entry, ['name', 'columns', 'rows'], 'BACKUP_INVALID_TABLE');
    if (entry.name !== BACKUP_TABLES[index]) throw new Error('BACKUP_INVALID_TABLE_ORDER');
    const expected = expectedColumns.get(BACKUP_TABLES[index]);
    if (
      !expected ||
      expected.length < 1 ||
      expected.some((name) => !ID_COLUMN.test(name)) ||
      new Set(expected).size !== expected.length
    )
      throw new Error('BACKUP_LOCAL_SCHEMA_UNAVAILABLE');
    if (
      !Array.isArray(entry.columns) ||
      entry.columns.length !== expected.length ||
      entry.columns.some((value, i) => value !== expected[i])
    )
      throw new Error('BACKUP_COLUMN_SCHEMA_MISMATCH');
    if (!Array.isArray(entry.rows)) throw new Error('BACKUP_INVALID_ROWS');
    totalRows += entry.rows.length;
    if (totalRows > 50_000) throw new Error('BACKUP_TOO_MANY_ROWS');
    for (const row of entry.rows) {
      if (!Array.isArray(row) || row.length !== expected.length)
        throw new Error('BACKUP_INVALID_ROW_SHAPE');
      for (const value of row) {
        if (
          value !== null &&
          typeof value !== 'string' &&
          !(typeof value === 'number' && Number.isSafeInteger(value))
        )
          throw new Error('BACKUP_UNSUPPORTED_SQL_VALUE');
        if (typeof value === 'string' && value.length > 300_000)
          throw new Error('BACKUP_ROW_VALUE_TOO_LARGE');
      }
    }
  }
  return input as unknown as BackupSnapshot;
}

export function previewBackup(snapshot: BackupSnapshot): BackupPreview {
  const tableCounts = snapshot.tables.map((entry) => ({
    table: entry.name,
    count: entry.rows.length,
  }));
  return {
    schemaVersion: snapshot.schemaVersion,
    createdAt: snapshot.createdAt,
    totalRows: tableCounts.reduce((n, x) => n + x.count, 0),
    tableCounts,
    canRestore: false,
  };
}

/** Cross-platform strict UTF-8 without relying on Hermes' optional TextEncoder. */
export function utf8Bytes(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const result: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      result.push(Number.parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      result.push(encoded.charCodeAt(i));
    }
  }
  return new Uint8Array(result);
}
export function utf8String(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (const byte of bytes) parts.push('%' + byte.toString(16).padStart(2, '0'));
  try {
    return decodeURIComponent(parts.join(''));
  } catch {
    throw new Error('BACKUP_INVALID_UTF8');
  }
}

/** SHA-256 is supplemental to the AES-GCM authentication tag. */
export async function buildAuthenticatedPayload(
  snapshot: BackupSnapshot,
  sha256: (data: string) => Promise<string>,
): Promise<string> {
  const serialized = JSON.stringify(snapshot);
  if (serialized.length > BACKUP_MAX_PLAINTEXT_CHARS) throw new Error('BACKUP_TOO_LARGE');
  const digest = await sha256(serialized);
  if (!SHA256.test(digest)) throw new Error('BACKUP_INVALID_DIGEST');
  return JSON.stringify({ format: BACKUP_PAYLOAD_FORMAT, sha256: digest, snapshot });
}

export async function readAuthenticatedPayload(
  plaintext: string,
  expectedColumns: ExpectedColumns,
  sha256: (data: string) => Promise<string>,
): Promise<{ snapshot: BackupSnapshot; preview: BackupPreview }> {
  if (plaintext.length > BACKUP_MAX_PLAINTEXT_CHARS + 512) throw new Error('BACKUP_TOO_LARGE');
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    throw new Error('BACKUP_INVALID_PAYLOAD');
  }
  if (!isRecord(parsed)) throw new Error('BACKUP_INVALID_PAYLOAD');
  exactFields(parsed, ['format', 'sha256', 'snapshot'], 'BACKUP_INVALID_PAYLOAD');
  if (
    parsed.format !== BACKUP_PAYLOAD_FORMAT ||
    typeof parsed.sha256 !== 'string' ||
    !SHA256.test(parsed.sha256)
  )
    throw new Error('BACKUP_INVALID_PAYLOAD');
  const snapshot = validateBackupSnapshot(parsed.snapshot, expectedColumns);
  const serialized = JSON.stringify(snapshot);
  if (serialized.length > BACKUP_MAX_PLAINTEXT_CHARS) throw new Error('BACKUP_TOO_LARGE');
  if ((await sha256(serialized)) !== parsed.sha256) throw new Error('BACKUP_DIGEST_MISMATCH');
  return { snapshot, preview: previewBackup(snapshot) };
}

export function encodeEncryptedEnvelope(ciphertextBase64: string): string {
  if (
    ciphertextBase64.length < 40 ||
    !BASE64.test(ciphertextBase64) ||
    ciphertextBase64.length > BACKUP_MAX_ENVELOPE_CHARS - 128
  )
    throw new Error('BACKUP_INVALID_CIPHERTEXT');
  return JSON.stringify({ format: BACKUP_FORMAT, ciphertextBase64 });
}
export function decodeEncryptedEnvelope(text: string): string {
  if (text.length > BACKUP_MAX_ENVELOPE_CHARS) throw new Error('BACKUP_TOO_LARGE');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('BACKUP_INVALID_ENVELOPE');
  }
  if (!isRecord(parsed)) throw new Error('BACKUP_INVALID_ENVELOPE');
  exactFields(parsed, ['format', 'ciphertextBase64'], 'BACKUP_INVALID_ENVELOPE');
  if (
    parsed.format !== BACKUP_FORMAT ||
    typeof parsed.ciphertextBase64 !== 'string' ||
    parsed.ciphertextBase64.length < 40 ||
    parsed.ciphertextBase64.length > BACKUP_MAX_ENVELOPE_CHARS - 128 ||
    !BASE64.test(parsed.ciphertextBase64)
  )
    throw new Error('BACKUP_INVALID_ENVELOPE');
  return parsed.ciphertextBase64;
}
export function normalizeRecoveryKey(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\s-]+/g, '')
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error('BACKUP_INVALID_RECOVERY_KEY');
  return normalized;
}
