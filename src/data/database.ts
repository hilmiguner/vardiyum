import * as SQLite from 'expo-sqlite';

import { INITIAL_SCHEMA, SCHEMA_VERSION } from './schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('vardiyum.db');
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new Error('UNSUPPORTED_DATABASE_VERSION');
  if (version === 0) {
    // These statements and the migration version change are all-or-nothing.
    try {
      await db.execAsync(`BEGIN IMMEDIATE; ${INITIAL_SCHEMA} COMMIT;`);
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw error;
    }
  }
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
