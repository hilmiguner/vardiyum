import assert from 'node:assert/strict';
import test from 'node:test';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  BACKUP_TABLES,
  BACKUP_SCHEMA_VERSION,
  BACKUP_SNAPSHOT_FORMAT,
  BACKUP_FORMAT,
  normalizeRecoveryKey,
  utf8Bytes,
  utf8String,
  validateBackupSnapshot,
  previewBackup,
  buildAuthenticatedPayload,
  readAuthenticatedPayload,
  encodeEncryptedEnvelope,
  decodeEncryptedEnvelope,
} from '../src/domain/backup-archive.ts';
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

const sha = async (data) => createHash('sha256').update(data).digest('hex');
const aad = Buffer.from(utf8Bytes('vardiyum|backup=v1|aes=256-gcm|schema=8'));
function fakeColumns() {
  return new Map(BACKUP_TABLES.map((name) => [name, ['id', 'value']]));
}
function fakeSnapshot() {
  return {
    format: BACKUP_SNAPSHOT_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: '2026-11-15T12:00:00.000Z',
    tables: BACKUP_TABLES.map((name, i) => ({
      name,
      columns: ['id', 'value'],
      rows: i === 0 ? [['shift', 'Sabah / Morning']] : [],
    })),
  };
}
function sqliteV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ]) {
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  }
  return db;
}
test('complete v8 inventory covers 18 real SQLite tables, no platform files copied', () => {
  const db = sqliteV8();
  try {
    const actual = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    assert.deepEqual(actual.map((x) => x.name).sort(), [...BACKUP_TABLES].sort());
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
    const expected = new Map();
    const tables = BACKUP_TABLES.map((name) => {
      const columns = db
        .prepare('PRAGMA table_info(' + name + ')')
        .all()
        .map((x) => x.name);
      expected.set(name, columns);
      const records = db.prepare('SELECT * FROM ' + name + ' ORDER BY rowid').all();
      return { name, columns, rows: records.map((row) => columns.map((c) => row[c])) };
    });
    const snap = {
      format: BACKUP_SNAPSHOT_FORMAT,
      schemaVersion: 8,
      createdAt: '2026-11-15T12:00:00.000Z',
      tables,
    };
    assert.equal(validateBackupSnapshot(snap, expected), snap);
    assert.equal(previewBackup(snap).canRestore, false);
    assert.equal(previewBackup(snap).tableCounts.length, 18);
    assert.equal(previewBackup(snap).totalRows, 4); // default shift templates only
  } finally {
    db.close();
  }
});
test('UTF-8 roundtrip preserves Turkish, emoji, accents and newline', () => {
  const text = 'Vardiyum: Şubat, ığüşİÖ, 🧪 🌙, année\nÇalışma';
  assert.equal(utf8String(utf8Bytes(text)), text);
  assert.throws(() => utf8String(new Uint8Array([0xc3, 0x28])), /BACKUP_INVALID_UTF8/);
});
test('authenticated JSON digest and deterministic metadata validate without writes', async () => {
  const snapshot = fakeSnapshot();
  validateBackupSnapshot(snapshot, fakeColumns());
  const payload = await buildAuthenticatedPayload(snapshot, sha);
  const parsed = await readAuthenticatedPayload(payload, fakeColumns(), sha);
  assert.equal(parsed.preview.totalRows, 1);
  assert.equal(parsed.preview.canRestore, false);
  assert.equal(parsed.snapshot.tables[0].rows[0][1], 'Sabah / Morning');
  assert.equal(parsed.snapshot.createdAt, snapshot.createdAt);
});
test('tampering with the decrypted snapshot is detected before any import', async () => {
  const payload = await buildAuthenticatedPayload(fakeSnapshot(), sha);
  const altered = JSON.parse(payload);
  altered.snapshot.tables[0].rows[0][1] = 'Tampered';
  await assert.rejects(
    () => readAuthenticatedPayload(JSON.stringify(altered), fakeColumns(), sha),
    /BACKUP_DIGEST_MISMATCH/,
  );
});
test('schema mismatch, removed table and additional columns fail closed', () => {
  const snap = fakeSnapshot(),
    expected = fakeColumns();
  assert.throws(
    () => validateBackupSnapshot({ ...snap, schemaVersion: 7 }, expected),
    /BACKUP_UNSUPPORTED_SCHEMA/,
  );
  assert.throws(
    () => validateBackupSnapshot({ ...snap, tables: snap.tables.slice(1) }, expected),
    /BACKUP_INCOMPLETE_TABLES/,
  );
  assert.throws(
    () =>
      validateBackupSnapshot(
        {
          ...snap,
          tables: snap.tables.map((t, i) =>
            i === 0 ? { ...t, columns: ['id', 'secret'] } : t,
          ),
        },
        expected,
      ),
    /BACKUP_COLUMN_SCHEMA_MISMATCH/,
  );
  assert.throws(
    () =>
      validateBackupSnapshot(
        {
          ...snap,
          tables: snap.tables.map((t, i) =>
            i === 0 ? { ...t, rows: [['id', 'value', 999]] } : t,
          ),
        },
        expected,
      ),
    /BACKUP_INVALID_ROW_SHAPE/,
  );
});
test('unexpected type, unsafe numeric integer and null insertion attack are rejected', () => {
  const snap = fakeSnapshot(),
    expected = fakeColumns();
  for (const invalid of [true, 1.5, Number.MAX_SAFE_INTEGER + 1, { dollar: 1 }, []]) {
    const changed = {
      ...snap,
      tables: snap.tables.map((t, i) => (i === 0 ? { ...t, rows: [['id', invalid]] } : t)),
    };
    assert.throws(
      () => validateBackupSnapshot(changed, expected),
      /BACKUP_UNSUPPORTED_SQL_VALUE/,
    );
  }
});
test('rejects unsupported or malformed envelope, excessive size and invalid recovery key', () => {
  assert.throws(() => decodeEncryptedEnvelope('not json'), /BACKUP_INVALID_ENVELOPE/);
  assert.throws(
    () =>
      decodeEncryptedEnvelope(
        JSON.stringify({ format: 'unknown', ciphertextBase64: 'a'.repeat(100) }),
      ),
    /BACKUP_INVALID_ENVELOPE/,
  );
  assert.throws(() => decodeEncryptedEnvelope('x'.repeat(8_000_001)), /BACKUP_TOO_LARGE/);
  assert.throws(() => encodeEncryptedEnvelope('>not base64<'), /BACKUP_INVALID_CIPHERTEXT/);
  assert.throws(() => normalizeRecoveryKey('short'), /BACKUP_INVALID_RECOVERY_KEY/);
  assert.equal(normalizeRecoveryKey('AA'.repeat(32)), 'aa'.repeat(32));
});
test('Node AES-256-GCM interoperable envelope shape, wrong key and tampering fail', async () => {
  const payload = await buildAuthenticatedPayload(fakeSnapshot(), sha);
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(utf8Bytes(payload)), cipher.final()]);
  const combined = Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
  const envelope = encodeEncryptedEnvelope(combined.toString('base64'));
  assert.equal(JSON.parse(envelope).format, BACKUP_FORMAT);
  const decoded = Buffer.from(decodeEncryptedEnvelope(envelope), 'base64');
  const decrypt = (secret, bytes) => {
    const dc = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
    dc.setAAD(aad);
    dc.setAuthTag(bytes.subarray(bytes.length - 16));
    return Buffer.concat([dc.update(bytes.subarray(12, bytes.length - 16)), dc.final()]);
  };
  const roundtrip = utf8String(decrypt(key, decoded));
  assert.equal(
    (await readAuthenticatedPayload(roundtrip, fakeColumns(), sha)).preview.totalRows,
    1,
  );
  assert.throws(() => decrypt(randomBytes(32), decoded));
  const corrupt = Buffer.from(decoded);
  corrupt[20] ^= 0x40;
  assert.throws(() => decrypt(key, corrupt));
  assert.notEqual(envelope.includes(key.toString('hex')), true);
});
test('future schemas and huge data must not be silently truncated or downgraded', async () => {
  const snap = fakeSnapshot();
  const broken = {
    ...snap,
    tables: snap.tables.map((t, i) =>
      i === 0 ? { ...t, rows: [['shift', 'x'.repeat(300_001)]] } : t,
    ),
  };
  assert.throws(
    () => validateBackupSnapshot(broken, fakeColumns()),
    /BACKUP_ROW_VALUE_TOO_LARGE/,
  );
  const payload = await buildAuthenticatedPayload(snap, sha);
  const bad = JSON.parse(payload);
  bad.format = 'v0-unsupported';
  await assert.rejects(
    () => readAuthenticatedPayload(JSON.stringify(bad), fakeColumns(), sha),
    /BACKUP_INVALID_PAYLOAD/,
  );
});
