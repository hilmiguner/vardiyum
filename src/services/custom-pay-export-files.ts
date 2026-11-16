import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { EarningsExportFormat } from '../domain/earnings-export.ts';

/**
 * A sensitive, plaintext export exists only while the user-initiated OS share
 * sheet is active. No uploads, background sync, or persistent document store.
 * Delete temporary plaintext after success, cancellation or share failure.
 */
export async function shareCustomPayExportFile(file: {
  name: string;
  mimeType: string;
  content: string;
}): Promise<void> {
  const format: EarningsExportFormat = file.mimeType === 'text/csv' ? 'csv' : 'json';
  if (
    !/^vardiyum-custom-estimate-(?:[2-9]|1\d|2[0-8])-\d{4}-(?:0[1-9]|1[0-2])\.(csv|json)$/.test(
      file.name,
    ) ||
    !file.name.endsWith('.' + format) ||
    !['text/csv', 'application/json'].includes(file.mimeType) ||
    !file.content
  ) throw new Error('CUSTOM_PAY_EXPORT_INVALID_FILE');
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('CUSTOM_PAY_EXPORT_SHARE_NOT_AVAILABLE');

  const fileOnDisk = new File(Paths.cache, file.name);
  try {
    fileOnDisk.create({ overwrite: true });
    fileOnDisk.write(file.content);
    await Sharing.shareAsync(fileOnDisk.uri, {
      mimeType: file.mimeType,
      dialogTitle: 'Vardiyum - custom pay estimate (personal data)',
      UTI: file.mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
    });
  } finally {
    // Expo shareAsync completes on dismissal. Never intentionally retain a
    // plaintext export across launches. Device-level cleanup needs native QA.
    if (fileOnDisk.exists) fileOnDisk.delete();
  }
}
