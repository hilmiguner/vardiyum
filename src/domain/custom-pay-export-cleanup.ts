const OWNED_EXPORT_NAME =
  /^vardiyum-custom-estimate-(?:[2-9]|1\d|2[0-8])-\d{4}-(?:0[1-9]|1[0-2])\.(csv|json)$/;

export function isCustomPayExportName(name: string): boolean {
  return name === name.trim() && OWNED_EXPORT_NAME.test(name);
}

export function purgeCustomPayExportFiles(
  files: readonly { name: string; delete: () => void }[],
): void {
  let failed = false;
  for (const file of files) {
    if (!isCustomPayExportName(file.name)) continue;
    try {
      file.delete();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('CUSTOM_PAY_EXPORT_CLEANUP_FAILED');
}
