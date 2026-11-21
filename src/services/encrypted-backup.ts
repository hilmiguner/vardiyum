import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
  CryptoDigestAlgorithm,
  digestStringAsync,
} from 'expo-crypto';

import {
  buildAuthenticatedPayload,
  readAuthenticatedPayload,
  normalizeRecoveryKey,
  encodeEncryptedEnvelope,
  decodeEncryptedEnvelope,
  utf8Bytes,
  utf8String,
  type BackupSnapshot,
  type ExpectedColumns,
} from '../domain/backup-archive';

const AAD = utf8Bytes('vardiyum|backup=v1|aes=256-gcm|schema=8');
const sha256 = (input: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, input);

export interface EncryptedBackupResult {
  /** NEVER store the recovery key with this file or log the key. */
  recoveryKey: string;
  ciphertextFileContents: string;
}

export async function createEncryptedBackup(
  snapshot: BackupSnapshot,
): Promise<EncryptedBackupResult> {
  const key = await AESEncryptionKey.generate();
  const plaintext = await buildAuthenticatedPayload(snapshot, sha256);
  const sealed = await aesEncryptAsync(utf8Bytes(plaintext), key, { additionalData: AAD });
  const combined = await sealed.combined('base64');
  if (typeof combined !== 'string') throw new Error('BACKUP_ENCRYPTION_FAILED');
  const recoveryKey = await key.encoded('hex');
  return {
    ciphertextFileContents: encodeEncryptedEnvelope(combined),
    recoveryKey: normalizeRecoveryKey(recoveryKey),
  };
}

/** Authenticated plaintext stays in memory, never written to the file/cache. */
export async function openEncryptedBackup(
  ciphertextFileContents: string,
  recoveryKeyInput: string,
  expectedColumns: ExpectedColumns,
) {
  const encoded = decodeEncryptedEnvelope(ciphertextFileContents);
  const keyHex = normalizeRecoveryKey(recoveryKeyInput);
  try {
    const key = await AESEncryptionKey.import(keyHex, 'hex');
    const sealed = AESSealedData.fromCombined(encoded);
    const bytes = await aesDecryptAsync(sealed, key, { output: 'bytes', additionalData: AAD });
    if (!(bytes instanceof Uint8Array)) throw new Error('BACKUP_DECRYPTION_FAILED');
    return readAuthenticatedPayload(utf8String(bytes), expectedColumns, sha256);
  } catch {
    // Never include raw content or the entered secret in exception messages.
    throw new Error('BACKUP_DECRYPTION_OR_VALIDATION_FAILED');
  }
}

/** Compatibility with earlier verification-only consumers. */
export async function verifyEncryptedBackup(
  ciphertextFileContents: string,
  recoveryKeyInput: string,
  expectedColumns: ExpectedColumns,
) {
  return (await openEncryptedBackup(ciphertextFileContents, recoveryKeyInput, expectedColumns))
    .preview;
}

/**
 * QA diagnostics only for a newly generated ciphertext and its matching key.
 * Never reveal recovery keys, ciphertext, plaintext or native exception text.
 * User-selected file verification retains its generic error behavior.
 */
export async function checkFreshEncryptedBackup(
  contents: string,
  recoveryKeyInput: string,
  expectedColumns: ExpectedColumns,
): Promise<void> {
  let combined: string;
  try {
    combined = decodeEncryptedEnvelope(contents);
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_ENVELOPE_FAILED');
  }
  let keyHex: string;
  try {
    keyHex = normalizeRecoveryKey(recoveryKeyInput);
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_KEY_FORMAT_FAILED');
  }
  let key: Awaited<ReturnType<typeof AESEncryptionKey.import>>;
  try {
    key = await AESEncryptionKey.import(keyHex, 'hex');
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_KEY_IMPORT_FAILED');
  }
  let sealed: ReturnType<typeof AESSealedData.fromCombined>;
  try {
    sealed = AESSealedData.fromCombined(combined);
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_COMBINED_FAILED');
  }
  let bytes: string | Uint8Array;
  try {
    bytes = await aesDecryptAsync(sealed, key, { output: 'bytes', additionalData: AAD });
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_AES_DECRYPT_FAILED');
  }
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('BACKUP_EXPORT_CHECK_BYTES_FAILED');
  }
  let plaintext: string;
  try {
    plaintext = utf8String(bytes);
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_UTF8_FAILED');
  }
  try {
    await readAuthenticatedPayload(plaintext, expectedColumns, sha256);
  } catch {
    throw new Error('BACKUP_EXPORT_CHECK_PAYLOAD_FAILED');
  }
}
