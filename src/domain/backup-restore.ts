import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLES,
  validateBackupSnapshot,
  type BackupSnapshot,
  type BackupSqlValue,
  type BackupTableName,
  type ExpectedColumns,
} from './backup-archive.ts';

export const RESTORE_MARKER_KEY = 'backup_restore_consumed';
export const REMINDER_CONSENT_KEY = 'routine_reminders_opted_in';

type Row = BackupSqlValue[];
export interface AtomicRestoreTransaction {
  schemaVersion(): Promise<number>;
  tableNames(): Promise<string[]>;
  columns(name: BackupTableName): Promise<string[]>;
  rows(name: BackupTableName): Promise<Row[]>;
  /** Allowed only after clean-target checks have passed. */
  removeSeedTemplates(): Promise<void>;
  insert(
    name: BackupTableName,
    columns: readonly string[],
    row: readonly BackupSqlValue[],
  ): Promise<void>;
  foreignKeyViolations(): Promise<number>;
  integrityResult(): Promise<string>;
}
export interface AtomicRestoreStore {
  withExclusiveTransaction<T>(
    execute: (tx: AtomicRestoreTransaction) => Promise<T>,
  ): Promise<T>;
}
export interface RestoreReceipt {
  sourceCreatedAt: string;
  restoredRows: number;
  tableCount: number;
  reminderConsentReset: true;
  target: 'clean_install_only';
}

const CLEAN_TEMPLATES: Readonly<Record<string, Record<string, BackupSqlValue>>> = {
  morning: {
    id: 'morning',
    name: 'Sabah',
    color: '#56A3FF',
    starts_at_local: '07:00',
    ends_at_local: '15:00',
    end_day_offset: 0,
    is_rest_day: 0,
    break_minutes: 0,
  },
  evening: {
    id: 'evening',
    name: 'Akşam',
    color: '#E8A86E',
    starts_at_local: '15:00',
    ends_at_local: '23:00',
    end_day_offset: 0,
    is_rest_day: 0,
    break_minutes: 0,
  },
  night: {
    id: 'night',
    name: 'Gece',
    color: '#A18CF6',
    starts_at_local: '23:00',
    ends_at_local: '07:00',
    end_day_offset: 1,
    is_rest_day: 0,
    break_minutes: 0,
  },
  off: {
    id: 'off',
    name: 'İzin',
    color: '#5EC59C',
    starts_at_local: null,
    ends_at_local: null,
    end_day_offset: 0,
    is_rest_day: 1,
    break_minutes: 0,
  },
};

function sameRow(a: readonly BackupSqlValue[], b: readonly BackupSqlValue[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function sameRecordRows(actual: readonly Row[], expected: readonly Row[]): boolean {
  return (
    actual.length === expected.length && actual.every((row, i) => sameRow(row, expected[i]))
  );
}
function isCleanTemplateBaseline(columns: readonly string[], rows: readonly Row[]): boolean {
  if (rows.length !== 4) return false;
  const idIndex = columns.indexOf('id');
  if (idIndex < 0 || columns.length !== Object.keys(CLEAN_TEMPLATES.morning).length)
    return false;
  const encountered = new Set<string>();
  for (const row of rows) {
    const id = row[idIndex];
    if (typeof id !== 'string' || !Object.hasOwn(CLEAN_TEMPLATES, id) || encountered.has(id))
      return false;
    encountered.add(id);
    const expected = columns.map((column) => CLEAN_TEMPLATES[id][column]);
    if (expected.some((value) => value === undefined) || !sameRow(row, expected)) return false;
  }
  return encountered.size === 4;
}

function normalizedRows(
  table: BackupTableName,
  columns: readonly string[],
  originalRows: readonly Row[],
): Row[] {
  if (table !== 'app_settings') return originalRows.map((row) => [...row]);
  const key = columns.indexOf('key'),
    value = columns.indexOf('value');
  if (key < 0 || value < 0) throw new Error('RESTORE_UNEXPECTED_APP_SETTINGS_SCHEMA');
  const result: Row[] = [];
  for (const source of originalRows) {
    if (source[key] === RESTORE_MARKER_KEY) continue;
    const row = [...source];
    if (row[key] === REMINDER_CONSENT_KEY) row[value] = '0';
    result.push(row);
  }
  return result;
}

/**
 * PRECONDITION: caller obtained the snapshot by AES-GCM authenticated decrypt
 * + SHA-256 and strict parser, and user explicitly confirmed the restore.
 *
 * All target validation, INSERTs, FK/integrity checks, and read-back happen in
 * the *same* exclusive transaction. The Expo exclusive connection may not
 * inherit PRAGMA foreign_keys=ON, so explicit foreign_key_check is mandatory
 * before COMMIT. No clean target -> no DELETE or INSERT.
 * A failed write must rollback via withExclusiveTransaction().
 */
export async function restoreToCleanInstall(
  store: AtomicRestoreStore,
  authenticatedSnapshot: BackupSnapshot,
): Promise<RestoreReceipt> {
  return store.withExclusiveTransaction(async (tx) => {
    if ((await tx.schemaVersion()) !== BACKUP_SCHEMA_VERSION)
      throw new Error('RESTORE_SCHEMA_VERSION_MISMATCH');
    const names = (await tx.tableNames()).sort();
    if (
      names.length !== BACKUP_TABLES.length ||
      names.some((name, i) => name !== [...BACKUP_TABLES].sort()[i])
    )
      throw new Error('RESTORE_UNKNOWN_TARGET_TABLES');
    const expectedColumns = new Map<BackupTableName, readonly string[]>();
    for (const table of BACKUP_TABLES) {
      expectedColumns.set(table, await tx.columns(table));
    }
    const snapshot = validateBackupSnapshot(authenticatedSnapshot, expectedColumns);
    // Never attempt to merge with an initialized or modified installation.
    for (const table of BACKUP_TABLES) {
      const rows = await tx.rows(table);
      if (table === 'shift_templates') {
        if (!isCleanTemplateBaseline(expectedColumns.get(table)!, rows))
          throw new Error('RESTORE_TARGET_NOT_PRISTINE');
      } else if (rows.length) {
        throw new Error('RESTORE_TARGET_NOT_PRISTINE');
      }
    }
    await tx.removeSeedTemplates();
    let restoredRows = 0;
    for (const table of snapshot.tables) {
      const rows = normalizedRows(table.name, table.columns, table.rows);
      for (const row of rows) {
        await tx.insert(table.name, table.columns, row);
        restoredRows += 1;
      }
    }
    const settingsCols = expectedColumns.get('app_settings')!;
    const keyIndex = settingsCols.indexOf('key');
    const valueIndex = settingsCols.indexOf('value');
    if (keyIndex < 0 || valueIndex < 0)
      throw new Error('RESTORE_UNEXPECTED_APP_SETTINGS_SCHEMA');
    const markerRow = settingsCols.map((column) =>
      column === 'key' ? RESTORE_MARKER_KEY : column === 'value' ? '1' : null,
    );
    await tx.insert('app_settings', settingsCols, markerRow);
    for (const table of snapshot.tables) {
      const rows = await tx.rows(table.name);
      const targetRows =
        table.name === 'app_settings'
          ? rows.filter((row) => row[keyIndex] !== RESTORE_MARKER_KEY)
          : rows;
      const expected = normalizedRows(table.name, table.columns, table.rows);
      if (!sameRecordRows(targetRows, expected))
        throw new Error('RESTORE_READBACK_MISMATCH:' + table.name);
    }
    if ((await tx.foreignKeyViolations()) !== 0)
      throw new Error('RESTORE_FOREIGN_KEY_CHECK_FAILED');
    if ((await tx.integrityResult()) !== 'ok')
      throw new Error('RESTORE_DATABASE_INTEGRITY_FAILED');
    return {
      sourceCreatedAt: snapshot.createdAt,
      restoredRows,
      tableCount: BACKUP_TABLES.length,
      reminderConsentReset: true,
      target: 'clean_install_only',
    };
  });
}
