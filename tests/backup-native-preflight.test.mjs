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

test('backup cache names include time and random UUID; never overwrite prior exports', () => {
  assert.match(files, /new Date\(\)\.toISOString\(\)\.replace\(/);
  assert.match(files, /randomUUID\(\)/);
  assert.match(files, /file\.create\(\{ overwrite: false \}\)/);
  assert.ok(!files.includes("toISOString().slice(0, 10)"));
});

test('backup generation self-verifies cached ciphertext before sharing key', () => {
  assert.match(panel, /readEncryptedBackupFromCache\(uri\)/);
  assert.match(panel, /stored !== encrypted\.ciphertextFileContents/);
  assert.match(panel, /openEncryptedBackup\(stored, encrypted\.recoveryKey, expectedColumns\)/);
  const selfCheck = panel.indexOf('await openEncryptedBackup(stored');
  const shareReady = panel.indexOf('setFileUri(uri)');
  assert.ok(selfCheck >= 0 && selfCheck < shareReady);
  assert.match(panel, /BACKUP_EXPORT_SELF_CHECK_FAILED/);
  assert.match(panel, /setRecoveryKey\(encrypted\.recoveryKey\)/);
});
