import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  MIGRATION_5_SQL,
  MIGRATION_6_SQL,
  MIGRATION_7_SQL,
  MIGRATION_8_SQL,
} from '../src/data/schema.ts';
import {
  customBreakEventKey,
  customBreakHeadKey,
  customBreakPrefix,
  createCustomBreakEvent,
  decodeCustomBreakHistory,
} from '../src/domain/custom-pay-break-audit.ts';
import {
  appendCustomPayBreakRevision,
  readCustomPayBreakHistory,
  workFromCustomBreakRow,
  CUSTOM_BREAK_WORK_SQL,
} from '../src/domain/custom-pay-break-store.ts';
import { splitWorkForPayPeriod } from '../src/domain/pay-period.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';

const WORK_ID = 'work_night_1';
const FIRST_INSTANT = '2026-11-25T20:00:00.000Z';
const LAST_INSTANT = '2026-11-26T04:00:00.000Z';
const FIRST_EVENT_TIME = '2026-11-15T12:00:00.000Z';
const SECOND_EVENT_TIME = '2026-11-15T12:01:00.000Z';

function initDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const migration of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ]) {
    db.exec('BEGIN IMMEDIATE;' + migration + 'COMMIT;');
  }
  db.prepare(
    'INSERT INTO actual_work_sessions (' +
      'id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,' +
      'end_choice,start_instant_utc,end_instant_utc,break_minutes,note' +
      ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    WORK_ID,
    '2026-11-25',
    '23:00',
    '2026-11-26',
    '07:00',
    'Europe/Istanbul',
    'reject',
    'reject',
    FIRST_INSTANT,
    LAST_INSTANT,
    30,
    'self-reported',
  );
  return db;
}

function store(db) {
  return {
    async getFirstAsync(sql, ...params) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    async runAsync(sql, ...params) {
      return db.prepare(sql).run(...params);
    },
  };
}

function actualWork(db, id = WORK_ID) {
  const row = db.prepare(CUSTOM_BREAK_WORK_SQL + ' WHERE id=?').get(id);
  return row ? workFromCustomBreakRow(row) : null;
}

async function transact(db, input, adapt = store(db)) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = await appendCustomPayBreakRevision(adapt, input);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

function input(minutes = 10, expectedRevision = 0, recordedAt = FIRST_EVENT_TIME) {
  return {
    workId: WORK_ID,
    startDay: 26,
    startPeriodBreakMinutes: minutes,
    expectedRevision,
    reason: expectedRevision ? 'Corrected actual break' : 'Initial user declaration',
    recordedAt,
  };
}

function countAuditRows(db, workId = WORK_ID, startDay = 26) {
  const prefix = customBreakPrefix(workId, startDay);
  return db.prepare('SELECT COUNT(*) AS n FROM app_settings WHERE substr(key,1,?)=?').get(
    prefix.length,
    prefix,
  ).n;
}

test('v8 native-shaped SQLite audit creates both keys and exact 26->25 seconds', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    const first = await transact(db, input());
    assert.equal(first.schema, 1);
    assert.equal(first.revision, 1);
    assert.equal(first.startPeriodKey, '2026-10');
    assert.equal(countAuditRows(db), 2);
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?').get(
        customBreakHeadKey(WORK_ID, 26),
      ).value,
      '1',
    );
    const history = await readCustomPayBreakHistory(store(db), actualWork(db), 26);
    assert.equal(history.length, 1);
    assert.deepEqual(history[0], first);
    const work = actualWork(db);
    const left = splitWorkForPayPeriod(work, '2026-10', 26, first);
    const right = splitWorkForPayPeriod(work, '2026-11', 26, first);
    assert.equal(left.netSeconds, 50 * 60);
    assert.equal(right.netSeconds, 6 * 3600 + 40 * 60);
    assert.equal(left.netSeconds + right.netSeconds, 7.5 * 3600);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    assert.equal(
      db.prepare(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      ).get().n,
      18,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});

test('second user correction is append-only; older event bytes stay identical', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    await transact(db, input());
    const oldPayload = db.prepare('SELECT value FROM app_settings WHERE key=?').get(
      customBreakEventKey(WORK_ID, 26, 1),
    ).value;
    const second = await transact(db, input(20, 1, SECOND_EVENT_TIME));
    assert.equal(second.revision, 2);
    assert.equal(second.startPeriodBreakMinutes, 20);
    assert.equal(countAuditRows(db), 3);
    assert.equal(db.prepare('SELECT value FROM app_settings WHERE key=?').get(
      customBreakEventKey(WORK_ID, 26, 1),
    ).value, oldPayload);
    assert.equal(db.prepare('SELECT value FROM app_settings WHERE key=?').get(
      customBreakHeadKey(WORK_ID, 26),
    ).value, '2');
    const history = await readCustomPayBreakHistory(store(db), actualWork(db), 26);
    assert.deepEqual(history.map((e) => e.revision), [1, 2]);
    assert.deepEqual(history.map((e) => e.startPeriodBreakMinutes), [10, 20]);
  } finally {
    db.close();
  }
});

test('stale UI, unchanged revision, invalid break, invalid reason rollback completely', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    await transact(db, input());
    const before = db.prepare('SELECT key,value FROM app_settings ORDER BY key').all();
    for (const candidate of [
      input(20, 0, SECOND_EVENT_TIME),
      input(10, 1, SECOND_EVENT_TIME),
      input(70, 1, SECOND_EVENT_TIME),
      { ...input(20, 1, SECOND_EVENT_TIME), reason: '  ' },
      { ...input(20, 1, SECOND_EVENT_TIME), recordedAt: '2026-11-15T11:59:00.000Z' },
    ]) {
      await assert.rejects(() => transact(db, candidate));
    }
    assert.deepEqual(db.prepare('SELECT key,value FROM app_settings ORDER BY key').all(), before);
    assert.equal(countAuditRows(db), 2);
  } finally {
    db.close();
  }
});

test('settings change isolates old day namespace and rejects stale screen submission', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    await transact(db, input());
    await writePayPeriodStartDay(store(db), 27);
    await assert.rejects(
      () => transact(db, input(20, 1, SECOND_EVENT_TIME)),
      /CUSTOM_BREAK_SETTING_CHANGED/,
    );
    assert.equal(countAuditRows(db, WORK_ID, 26), 2);
    assert.equal(countAuditRows(db, WORK_ID, 27), 0);
    await writePayPeriodStartDay(store(db), 26);
    const history = await readCustomPayBreakHistory(store(db), actualWork(db), 26);
    assert.equal(history.length, 1);
  } finally {
    db.close();
  }
});

test('event insert followed by fault in head insert rolls back transaction', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    const base = store(db);
    const broken = {
      ...base,
      async runAsync(sql, ...params) {
        if (sql.includes('INSERT INTO app_settings') && params[0] === customBreakHeadKey(WORK_ID, 26))
          throw new Error('INJECTED_DISK_FAILURE');
        return base.runAsync(sql, ...params);
      },
    };
    await assert.rejects(() => transact(db, input(), broken), /INJECTED_DISK_FAILURE/);
    assert.equal(countAuditRows(db), 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n, 1);
  } finally {
    db.close();
  }
});

test('corrupt head, missing event, revision gap and modified source are rejected', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    await transact(db, input());
    await transact(db, input(20, 1, SECOND_EVENT_TIME));
    const work = actualWork(db);
    const payload = db.prepare('SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key')
      .all(customBreakPrefix(WORK_ID, 26).length, customBreakPrefix(WORK_ID, 26));
    assert.equal(decodeCustomBreakHistory(work, 26, payload).length, 2);
    await assert.rejects(
      async () => decodeCustomBreakHistory(work, 26, payload.filter((r) => r.key !== customBreakHeadKey(WORK_ID, 26))),
      /CUSTOM_BREAK_HEAD_MISSING/,
    );
    assert.throws(
      () => decodeCustomBreakHistory(work, 26, payload.filter((r) => r.key !== customBreakEventKey(WORK_ID, 26, 1))),
      /INVALID_CUSTOM_BREAK_HEAD|CUSTOM_BREAK_AUDIT_GAP/,
    );
    const changedHead = payload.map((r) =>
      r.key === customBreakHeadKey(WORK_ID, 26) ? { ...r, value: '3' } : r,
    );
    assert.throws(() => decodeCustomBreakHistory(work, 26, changedHead), /INVALID_CUSTOM_BREAK_HEAD/);
    const staleWork = { ...work, endInstantUtc: '2026-11-26T03:00:00.000Z' };
    assert.throws(() => decodeCustomBreakHistory(staleWork, 26, payload), /INVALID_CUSTOM_BREAK_EVENT/);
    const changedPayload = payload.map((r) =>
      r.key === customBreakEventKey(WORK_ID, 26, 1)
        ? { ...r, value: r.value.replace('"startPeriodBreakMinutes":10', '"startPeriodBreakMinutes":9') }
        : r,
    );
    assert.throws(() => decodeCustomBreakHistory(work, 26, changedPayload), /INVALID_CUSTOM_BREAK_EVENT/);
  } finally {
    db.close();
  }
});

test('work IDs containing underscore do not wildcard-match another audit stream', async () => {
  const db = initDb();
  try {
    await writePayPeriodStartDay(store(db), 26);
    await transact(db, input());
    const work = actualWork(db);
    const prefix = customBreakPrefix(WORK_ID, 26);
    db.prepare('INSERT INTO app_settings(key,value) VALUES (?,?)').run(
      prefix.replace('_', 'x') + 'event:001',
      '{}',
    );
    assert.equal((await readCustomPayBreakHistory(store(db), work, 26)).length, 1);
  } finally {
    db.close();
  }
});

test('no period break allocation is allowed when day1, no break or invalid source', () => {
  const work = {
    id: WORK_ID,
    localDate: '2026-11-25',
    endDate: '2026-11-26',
    timeZone: 'Europe/Istanbul',
    startInstantUtc: FIRST_INSTANT,
    endInstantUtc: LAST_INSTANT,
    breakMinutes: 30,
    source: 'user_entered',
  };
  assert.throws(() => createCustomBreakEvent(work, 1, 10, 1, 'Explicit split', FIRST_EVENT_TIME),
    /CUSTOM_BREAK_REQUIRES_NONCALENDAR_PERIOD/);
  assert.throws(() => createCustomBreakEvent({ ...work, breakMinutes: 0 }, 26, 0, 1, 'Explicit split', FIRST_EVENT_TIME),
    /WORK_NOT_CROSS_CUSTOM_PAY_PERIOD_BREAK/);
  assert.throws(() => createCustomBreakEvent({ ...work, source: 'planned' }, 26, 10, 1, 'Explicit split', FIRST_EVENT_TIME),
    /UNVERIFIED_WORK_SOURCE/);
  assert.throws(() => customBreakEventKey(WORK_ID, 26, 65), /CUSTOM_BREAK_REVISION_LIMIT/);
});
