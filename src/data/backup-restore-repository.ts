import { getDatabase } from './database';
import {
  BACKUP_TABLES,
  type BackupSnapshot,
  type BackupSqlValue,
  type BackupTableName,
} from '../domain/backup-archive';
import {
  restoreToCleanInstall,
  type AtomicRestoreTransaction,
  type RestoreReceipt,
} from '../domain/backup-restore';

type SQLiteRow = Record<string, BackupSqlValue>;
const NAMES = new Set<string>(BACKUP_TABLES);

function safeName(name: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('RESTORE_INVALID_SQL_IDENTIFIER');
  return '"' + name + '"';
}
/**
 * Restores authenticated v8 snapshot ONLY into the four untouched seed
 * templates of a pristine installation. All 18-table inserts are made on the
 * exclusive txn connection, verified by full readback + PRAGMA foreign_key_check
 * and integrity_check BEFORE transaction commit.
 *
 * Expo's exclusive transaction uses a separate connection, and may not
 * inherit PRAGMA foreign_keys=ON. Never rely on FK enforcement alone.
 */
export async function commitCleanInstallRestore(
  verifiedSnapshot: BackupSnapshot,
): Promise<RestoreReceipt> {
  const db = await getDatabase();
  let receipt: RestoreReceipt | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const adapter: AtomicRestoreTransaction = {
      schemaVersion: async () => {
        const row = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        return row?.user_version ?? -1;
      },
      tableNames: async () => {
        const names = await tx.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );
        return names.map((r) => r.name);
      },
      columns: async (name: BackupTableName) => {
        if (!NAMES.has(name)) throw new Error('RESTORE_INVALID_TABLE');
        const cols = await tx.getAllAsync<{ name: string }>(
          'PRAGMA table_info(' + safeName(name) + ')',
        );
        return cols.map((r) => r.name);
      },
      rows: async (name: BackupTableName) => {
        if (!NAMES.has(name)) throw new Error('RESTORE_INVALID_TABLE');
        const cols = await adapter.columns(name);
        const rows = await tx.getAllAsync<SQLiteRow>(
          'SELECT * FROM ' + safeName(name) + ' ORDER BY rowid',
        );
        return rows.map((row) => cols.map((col) => row[col]));
      },
      removeSeedTemplates: async () => {
        await tx.runAsync('DELETE FROM shift_templates');
      },
      insert: async (
        name: BackupTableName,
        columns: readonly string[],
        row: readonly BackupSqlValue[],
      ) => {
        if (!NAMES.has(name) || row.length !== columns.length || columns.length === 0)
          throw new Error('RESTORE_INVALID_INSERT');
        const allowed = await adapter.columns(name);
        if (columns.length !== allowed.length || columns.some((col, i) => col !== allowed[i]))
          throw new Error('RESTORE_COLUMN_MISMATCH');
        const query =
          'INSERT INTO ' +
          safeName(name) +
          ' (' +
          columns.map(safeName).join(',') +
          ') VALUES (' +
          columns.map(() => '?').join(',') +
          ')';
        await tx.runAsync(query, ...row);
      },
      foreignKeyViolations: async () => {
        const rows = await tx.getAllAsync('PRAGMA foreign_key_check');
        return rows.length;
      },
      integrityResult: async () => {
        const row = await tx.getFirstAsync<{ integrity_check: string }>(
          'PRAGMA integrity_check',
        );
        return row?.integrity_check ?? 'missing';
      },
    };
    receipt = await restoreToCleanInstall(
      {
        withExclusiveTransaction: async (execute) => execute(adapter),
      },
      verifiedSnapshot,
    );
  });
  if (!receipt) throw new Error('RESTORE_NOT_COMMITTED');
  return receipt;
}
