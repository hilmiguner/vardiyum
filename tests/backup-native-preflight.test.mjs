import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const files = readFileSync(
  new URL('../src/services/encrypted-backup-files.ts', import.meta.url),
  'utf8',
);
const panel = readFileSync(
  new URL('../src/components/encrypted-backup-panel.tsx', import.meta.url),
  'utf8',
);
const crypto = readFileSync(
  new URL('../src/services/encrypted-backup.ts', import.meta.url),
  'utf8',
);

test('new cache filenames are unique and do not overwrite earlier exports', () => {
  assert.ok(files.includes('new Date().toISOString().replace('));
  assert.ok(files.includes('randomUUID()'));
  assert.ok(files.includes('file.create({ overwrite: false })'));
  assert.ok(!files.includes('toISOString().slice(0, 10)'));
});

test('fresh self-check finishes before showing the recovery key or sharing', () => {
  assert.ok(panel.includes('readEncryptedBackupFromCache(uri)'));
  assert.ok(panel.includes('stored !== encrypted.ciphertextFileContents'));
  assert.ok(panel.includes('BACKUP_EXPORT_CHECK_CACHE_READ_FAILED'));
  assert.ok(panel.includes('BACKUP_EXPORT_CHECK_CACHE_MISMATCH'));
  const checked = panel.indexOf('await checkFreshEncryptedBackup(stored');
  const ready = panel.indexOf('setFileUri(uri)');
  assert.ok(checked >= 0 && checked < ready);
  assert.ok(panel.includes('setRecoveryKey(encrypted.recoveryKey)'));
});

test('fresh-export diagnostics use fixed stages and preserve generic import errors', () => {
  for (const stage of [
    'ENVELOPE',
    'KEY_FORMAT',
    'KEY_IMPORT',
    'COMBINED',
    'AES_DECRYPT',
    'BYTES',
    'UTF8',
    'PAYLOAD',
  ]) {
    assert.ok(crypto.includes(`BACKUP_EXPORT_CHECK_${stage}_FAILED`));
  }
  assert.ok(crypto.includes('export async function checkFreshEncryptedBackup'));
  assert.ok(crypto.includes('BACKUP_DECRYPTION_OR_VALIDATION_FAILED'));
  assert.ok(!crypto.includes('console.log'));
  assert.ok(!crypto.includes('console.error'));
});
