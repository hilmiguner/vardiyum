import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { BACKUP_MAX_ENVELOPE_CHARS, decodeEncryptedEnvelope } from '../domain/backup-archive';

/**
 * Cache contains only authenticated ciphertext; the recovery key is never
 * persisted to the backup file, cache, logs or app_settings.
 */
export function writeEncryptedFileToCache(fileContents: string): string {
  decodeEncryptedEnvelope(fileContents);
  const file = new File(
    Paths.cache,
    'vardiyum-encrypted-' + new Date().toISOString().slice(0, 10) + '.vdb',
  );
  file.create({ overwrite: true });
  file.write(fileContents);
  return file.uri;
}
export async function shareEncryptedFile(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('BACKUP_SHARE_NOT_AVAILABLE');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Vardiyum encrypted backup',
    UTI: 'public.data',
  });
}
export async function pickEncryptedFile(): Promise<string | null> {
  const choice = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: '*/*',
  });
  if (choice.canceled) return null;
  const entry = choice.assets[0];
  if (!entry) throw new Error('BACKUP_INVALID_ENVELOPE');
  if (entry.size !== undefined && entry.size > BACKUP_MAX_ENVELOPE_CHARS)
    throw new Error('BACKUP_TOO_LARGE');
  const file = new File(entry.uri);
  if (file.size > BACKUP_MAX_ENVELOPE_CHARS) throw new Error('BACKUP_TOO_LARGE');
  const text = await file.text();
  decodeEncryptedEnvelope(text);
  return text;
}
