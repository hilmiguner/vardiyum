import * as SQLite from 'expo-sqlite';

import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  MIGRATION_5_SQL,
  MIGRATION_6_SQL,
  MIGRATION_7_SQL,
  MIGRATION_8_SQL,
  SCHEMA_VERSION,
} from './schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('vardiyum.db');
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new Error('UNSUPPORTED_DATABASE_VERSION');
  // A migration must either complete with its version stamp or roll back.
  const apply = async (sql: string) => {
    try {
      await db.execAsync(`BEGIN IMMEDIATE; ${sql} COMMIT;`);
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw error;
    }
  };
  if (version === 0) await apply(INITIAL_SCHEMA);
  if (version < 2) await apply(MIGRATION_2_SQL);
  if (version < 3) await apply(MIGRATION_3_SQL);
  if (version < 4) await apply(MIGRATION_4_SQL);
  if (version < 5) await apply(MIGRATION_5_SQL);
  if (version < 6) await apply(MIGRATION_6_SQL);
  if (version < 7) await apply(MIGRATION_7_SQL);
  if (version < 8) await apply(MIGRATION_8_SQL);
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
