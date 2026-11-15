import { getDatabase } from './database';
import { loadCustomPayProfilePreviewFromStore } from '../domain/custom-pay-profile-preview-store';

/** Preview only; never modifies profiles, work, earnings or adjustments. */
export async function loadCustomPayProfilePreview(periodKey: string, timeZone: string) {
  return loadCustomPayProfilePreviewFromStore(await getDatabase(), periodKey, timeZone);
}
