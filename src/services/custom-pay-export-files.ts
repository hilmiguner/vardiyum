import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { EarningsExportFormat } from '../domain/earnings-export.ts';
import {
  isCustomPayExportName,
  purgeCustomPayExportFiles,
} from '../domain/custom-pay-export-cleanup';

let shareInProgress = false;

/** Recover orphaned plaintext after a prior process died during sharing. */
export function cleanupStaleCustomPayExportFiles(): void {
  if (shareInProgress) return;
  try {
    const files = Paths.cache.list().filter((entry): entry is File => entry instanceof File);
    purgeCustomPayExportFiles(files);
  } catch {
    throw new Error('CUSTOM_PAY_EXPORT_CLEANUP_FAILED');
  }
}

/**
 * A sensitive, plaintext export exists only while the user-initiated OS share
 * sheet is active. Recover interrupted exports on the next app launch.
 */
export async function shareCustomPayExportFile(file: {
  name: string;
  mimeType: string;
  content: string;
}): Promise<void> {
  const format: EarningsExportFormat = file.mimeType === 'text/csv' ? 'csv' : 'json';
  if (
    !isCustomPayExportName(file.name) ||
    !file.name.endsWith('.' + format) ||
    !['text/csv', 'application/json'].includes(file.mimeType) ||
    !file.content
  )
    throw new Error('CUSTOM_PAY_EXPORT_INVALID_FILE');
  if (shareInProgress) throw new Error('CUSTOM_PAY_EXPORT_BUSY');
  cleanupStaleCustomPayExportFiles();
  shareInProgress = true;
  try {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('CUSTOM_PAY_EXPORT_SHARE_NOT_AVAILABLE');

    const fileOnDisk = new File(Paths.cache, file.name);
    try {
      fileOnDisk.create({ overwrite: false });
      fileOnDisk.write(file.content);
      const uti =
        file.mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json';
      await Sharing.shareAsync(fileOnDisk.uri, {
        mimeType: file.mimeType,
        dialogTitle: 'Vardiyum - custom pay estimate (personal data)',
        UTI: uti,
      });
    } finally {
      if (fileOnDisk.exists) fileOnDisk.delete();
    }
  } finally {
    shareInProgress = false;
  }
}
