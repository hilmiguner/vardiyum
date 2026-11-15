import { getDatabase } from './database';
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_SNAPSHOT_FORMAT,
  BACKUP_TABLES,
  BACKUP_MAX_PLAINTEXT_CHARS,
  validateBackupSnapshot,
  previewBackup,
  type BackupSnapshot,
  type BackupSqlValue,
  type BackupTable,
  type BackupTableName,
  type ExpectedColumns,
} from '../domain/backup-archive';

type ColumnInfo = { name: string; type: string };
type SqlRow = Record<string, BackupSqlValue>;

/**
 * These identifiers are compile-time trusted (never from the backup file).
 * A database upgrade must be accompanied by a reviewed new backup format.
 */
export async function readLocalBackupColumns(): Promise<ExpectedColumns> {
  const db = await getDatabase();
  const columns = new Map<BackupTableName, readonly string[]>();
  for (const name of BACKUP_TABLES) {
    const rows = await db.getAllAsync<ColumnInfo>('PRAGMA table_info(' + name + ')');
    if (rows.length === 0) throw new Error('BACKUP_LOCAL_SCHEMA_UNAVAILABLE');
    columns.set(
      name,
      rows.map((row) => row.name),
    );
  }
  return columns;
}

/**
 * Capture every v8 table inside an exclusive consistent SQLite transaction.
 * No writes occur. Never export the SQLite database/WAL file directly.
 */
export async function createBackupSnapshot(): Promise<{
  snapshot: BackupSnapshot;
  expectedColumns: ExpectedColumns;
}> {
  const db = await getDatabase();
  const expectedColumns = new Map<BackupTableName, readonly string[]>();
  const tables: BackupTable[] = [];
  await db.withExclusiveTransactionAsync(async (tx) => {
    const version = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (version?.user_version !== BACKUP_SCHEMA_VERSION)
      throw new Error('BACKUP_UNSUPPORTED_SCHEMA');
    for (const name of BACKUP_TABLES) {
      const infos = await tx.getAllAsync<ColumnInfo>('PRAGMA table_info(' + name + ')');
      const columns = infos.map((row) => row.name);
      if (!columns.length) throw new Error('BACKUP_LOCAL_SCHEMA_UNAVAILABLE');
      expectedColumns.set(name, columns);
      const raw = await tx.getAllAsync<SqlRow>('SELECT * FROM ' + name + ' ORDER BY rowid');
      tables.push({
        name,
        columns,
        rows: raw.map((row) => columns.map((column) => row[column])),
      });
    }
  });
  const snapshot: BackupSnapshot = {
    format: BACKUP_SNAPSHOT_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    tables,
  };
  const json = JSON.stringify(snapshot);
  if (json.length > BACKUP_MAX_PLAINTEXT_CHARS) throw new Error('BACKUP_TOO_LARGE');
  validateBackupSnapshot(snapshot, expectedColumns);
  return { snapshot, expectedColumns };
}

export async function getCurrentSchemaForReadOnlyPreview(): Promise<ExpectedColumns> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (row?.user_version !== BACKUP_SCHEMA_VERSION) throw new Error('BACKUP_UNSUPPORTED_SCHEMA');
  return readLocalBackupColumns();
}

export { previewBackup };
