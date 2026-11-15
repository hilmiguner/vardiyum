import {
  AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync,
  CryptoDigestAlgorithm, digestStringAsync,
} from 'expo-crypto';

import {
  buildAuthenticatedPayload, readAuthenticatedPayload, normalizeRecoveryKey,
  encodeEncryptedEnvelope, decodeEncryptedEnvelope, utf8Bytes, utf8String,
  type BackupSnapshot, type ExpectedColumns,
} from '../domain/backup-archive';

const AAD = utf8Bytes('vardiyum|backup=v1|aes=256-gcm|schema=8');
const sha256 = (input: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256,input);

export interface EncryptedBackupResult {
  /** NEVER store the recovery key with this file or log the key. */
  recoveryKey: string;
  ciphertextFileContents: string;
}

export async function createEncryptedBackup(
  snapshot:BackupSnapshot,
):Promise<EncryptedBackupResult>{
  const key=await AESEncryptionKey.generate();
  const plaintext=await buildAuthenticatedPayload(snapshot,sha256);
  const sealed=await aesEncryptAsync(utf8Bytes(plaintext),key,{additionalData:AAD});
  const combined=await sealed.combined('base64');
  if(typeof combined!=='string')throw new Error('BACKUP_ENCRYPTION_FAILED');
  const recoveryKey=await key.encoded('hex');
  return {
    ciphertextFileContents:encodeEncryptedEnvelope(combined),
    recoveryKey:normalizeRecoveryKey(recoveryKey),
  };
}

/** Authenticated preview only: there is deliberately NO restore/write path. */
export async function verifyEncryptedBackup(
  ciphertextFileContents:string,
  recoveryKeyInput:string,
  expectedColumns:ExpectedColumns,
) {
  const encoded=decodeEncryptedEnvelope(ciphertextFileContents);
  const keyHex=normalizeRecoveryKey(recoveryKeyInput);
  try {
    const key=await AESEncryptionKey.import(keyHex,'hex');
    const sealed=AESSealedData.fromCombined(encoded);
    const bytes=await aesDecryptAsync(sealed,key,{output:'bytes',additionalData:AAD});
    if (!(bytes instanceof Uint8Array)) throw new Error('BACKUP_DECRYPTION_FAILED');
    return (await readAuthenticatedPayload(utf8String(bytes),expectedColumns,sha256)).preview;
  } catch {
    // Never include raw content or the entered secret in exception messages.
    throw new Error('BACKUP_DECRYPTION_OR_VALIDATION_FAILED');
  }
}
