import {
  attributionEventKey,
  attributionHeadKey,
  attributionPrefix,
  createCustomAdjustmentAttributionEvent,
  customAdjustmentCandidatePeriods,
  decodeCustomAdjustmentAttributionHistory,
  type CustomAdjustmentAttributionEvent,
} from './custom-adjustment-attribution.ts';
import { validateAdjustment, type EarningsAdjustment } from './earnings-engine.ts';
import { customPayPeriodBounds } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';
import type { CustomBreakSqlStore } from './custom-pay-break-store.ts';

interface AdjustmentRow {
  id: string;
  period_key: string;
  kind: EarningsAdjustment['kind'];
  currency: string;
  amount_minor_units: number;
  note: string;
  source: string;
  created_at: string;
}
export function fromAdjustmentRow(row: AdjustmentRow): EarningsAdjustment {
  return validateAdjustment({
    id: row.id,
    periodKey: row.period_key,
    kind: row.kind,
    currency: row.currency,
    amountMinorUnits: row.amount_minor_units,
    note: row.note,
    source: row.source as EarningsAdjustment['source'],
    createdAt: row.created_at,
  });
}
const SOURCE_SQL =
  'SELECT id,period_key,kind,currency,amount_minor_units,note,source,created_at ' +
  'FROM earnings_adjustments';

export interface CustomAdjustmentSave {
  adjustmentId: string;
  startDay: number;
  earlierMinorUnits: number;
  expectedRevision: number;
  reason: string;
  recordedAt: string;
}

export interface CustomAdjustmentCandidate {
  adjustmentId: string;
  sourceCalendarMonth: string;
  kind: EarningsAdjustment['kind'];
  currency: string;
  note: string;
  sourceCreatedAt: string;
  originalMinorUnits: number;
  earlierPeriodKey: string;
  laterPeriodKey: string;
  earlierMinorUnits: number | null;
  laterMinorUnits: number | null;
  amountInSelectedPeriodMinorUnits: number | null;
  revision: number;
  stale: boolean;
}

export type CustomAdjustmentReport =
  | { status: 'disabled'; periodKey: string; startDay: 1 }
  | {
      status: 'empty' | 'requires_attribution' | 'verified';
      periodKey: string;
      startDay: number;
      startDate: string;
      endDateInclusive: string;
      pendingCount: number;
      candidates: CustomAdjustmentCandidate[];
      totals: { currency: string; minorUnits: number }[];
      scope: 'ATTRIBUTED_CALENDAR_ADJUSTMENTS_ONLY_NOT_COMBINED';
    };

export async function readCustomAdjustmentHistory(
  store: Pick<CustomBreakSqlStore, 'getAllAsync'>,
  adjustmentId: string,
  startDay: number,
): Promise<CustomAdjustmentAttributionEvent[]> {
  const prefix = attributionPrefix(startDay, adjustmentId);
  const rows = await store.getAllAsync<{ key: string; value: string }>(
    'SELECT key,value FROM app_settings WHERE substr(key,1,?)=? ORDER BY key',
    prefix.length, prefix,
  );
  return decodeCustomAdjustmentAttributionHistory(startDay, adjustmentId, rows);
}

/**
 * Must run inside SQLite withExclusiveTransactionAsync. The source monthly
 * adjustment is NEVER moved, altered or duplicated. A single per-source audit
 * event constrains both sibling special periods, even from two UI views.
 */
export async function appendCustomAdjustmentAttribution(
  store: CustomBreakSqlStore,
  input: CustomAdjustmentSave,
): Promise<CustomAdjustmentAttributionEvent> {
  attributionPrefix(input.startDay, input.adjustmentId);
  if (!Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision < 0 || input.expectedRevision >= 64)
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_EXPECTED_REVISION');
  if ((await readPayPeriodStartDay(store)) !== input.startDay)
    throw new Error('CUSTOM_ADJUSTMENT_SETTING_CHANGED');
  const row = await store.getFirstAsync<AdjustmentRow>(
    SOURCE_SQL + ' WHERE id=?', input.adjustmentId,
  );
  if (!row) throw new Error('CUSTOM_ADJUSTMENT_SOURCE_NOT_FOUND');
  const original = fromAdjustmentRow(row);
  const history = await readCustomAdjustmentHistory(
    store, input.adjustmentId, input.startDay,
  );
  if (history.length !== input.expectedRevision)
    throw new Error('STALE_CUSTOM_ADJUSTMENT_REVISION');
  if (history.length) {
    const previous = history[history.length - 1];
    if (JSON.stringify(previous.original) !== JSON.stringify(original))
      throw new Error('CUSTOM_ADJUSTMENT_SOURCE_CHANGED');
    if (previous.earlierMinorUnits === input.earlierMinorUnits)
      throw new Error('UNCHANGED_CUSTOM_ADJUSTMENT_SPLIT');
    if (input.recordedAt < previous.recordedAt)
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_REVISION');
  }
  const event = createCustomAdjustmentAttributionEvent(
    original, input.startDay, input.earlierMinorUnits,
    history.length + 1, input.reason, input.recordedAt,
  );
  await store.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?)',
    attributionEventKey(input.startDay, input.adjustmentId, event.revision),
    JSON.stringify(event),
  );
  const head = attributionHeadKey(input.startDay, input.adjustmentId);
  if (!history.length) {
    await store.runAsync('INSERT INTO app_settings(key,value) VALUES (?,?)', head, '1');
  } else {
    const updated = await store.runAsync(
      'UPDATE app_settings SET value=? WHERE key=? AND value=?',
      String(event.revision), head, String(history.length),
    );
    if (updated.changes !== 1)
      throw new Error('STALE_CUSTOM_ADJUSTMENT_REVISION');
  }
  const readback = await readCustomAdjustmentHistory(
    store, input.adjustmentId, input.startDay,
  );
  if (readback.length !== event.revision ||
      JSON.stringify(readback[readback.length - 1]) !== JSON.stringify(event))
    throw new Error('CUSTOM_ADJUSTMENT_READBACK_MISMATCH');
  return event;
}

/** One coherent read of both relevant calendar months and ALL history chains.
 * A missing or stale choice produces NO totals, including for the other sources.
 */
export async function loadCustomAdjustmentReportFromStore(
  store: Pick<CustomBreakSqlStore, 'getFirstAsync' | 'getAllAsync'>,
  periodKey: string,
): Promise<CustomAdjustmentReport> {
  const startDay = await readPayPeriodStartDay(store);
  if (startDay === 1) return { status: 'disabled', periodKey, startDay: 1 };
  const bounds = customPayPeriodBounds(periodKey, startDay);
  const rows = await store.getAllAsync<AdjustmentRow>(
    SOURCE_SQL + ' WHERE period_key IN (?,?) ORDER BY created_at,id',
    bounds.startDate.slice(0, 7), bounds.endDateInclusive.slice(0, 7),
  );
  const candidates: CustomAdjustmentCandidate[] = [];
  const seen = new Set<string>();
  let pendingCount = 0;
  const totals = new Map<string, number>();
  for (const row of rows) {
    const original = fromAdjustmentRow(row);
    if (seen.has(original.id)) throw new Error('DUPLICATE_CUSTOM_ADJUSTMENT_SOURCE');
    seen.add(original.id);
    const periods = customAdjustmentCandidatePeriods(original, startDay);
    if (periodKey !== periods.earlierPeriodKey &&
        periodKey !== periods.laterPeriodKey)
      throw new Error('CUSTOM_ADJUSTMENT_OUTSIDE_PERIOD');
    const history = await readCustomAdjustmentHistory(store, original.id, startDay);
    const latest = history[history.length - 1];
    const stale = latest !== undefined &&
      JSON.stringify(latest.original) !== JSON.stringify(original);
    const pending = latest === undefined || stale;
    if (pending) pendingCount++;
    const earlier = pending ? null : latest.earlierMinorUnits;
    const later = pending ? null : latest.laterMinorUnits;
    const amount = pending ? null :
      periodKey === periods.earlierPeriodKey ? earlier : later;
    candidates.push({
      adjustmentId: original.id,
      sourceCalendarMonth: original.periodKey,
      kind: original.kind,
      currency: original.currency,
      note: original.note,
      sourceCreatedAt: original.createdAt,
      originalMinorUnits: original.amountMinorUnits,
      earlierPeriodKey: periods.earlierPeriodKey,
      laterPeriodKey: periods.laterPeriodKey,
      earlierMinorUnits: earlier,
      laterMinorUnits: later,
      amountInSelectedPeriodMinorUnits: amount,
      revision: history.length,
      stale,
    });
    if (amount !== null) {
      const sum = (totals.get(original.currency) ?? 0) + amount;
      if (!Number.isSafeInteger(sum) || Math.abs(sum) > 1_000_000_000_000)
        throw new Error('CUSTOM_ADJUSTMENT_SUM_OVERFLOW');
      totals.set(original.currency, sum);
    }
  }
  if ((await readPayPeriodStartDay(store)) !== startDay)
    throw new Error('CUSTOM_ADJUSTMENT_SETTING_CHANGED_DURING_REPORT');
  const ready = pendingCount === 0;
  return {
    status: rows.length === 0 ? 'empty' : ready ? 'verified' : 'requires_attribution',
    periodKey, startDay, startDate: bounds.startDate,
    endDateInclusive: bounds.endDateInclusive, pendingCount, candidates,
    totals: ready ?
      [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(
        ([currency, minorUnits]) => ({ currency, minorUnits }),
      ) : [],
    scope: 'ATTRIBUTED_CALENDAR_ADJUSTMENTS_ONLY_NOT_COMBINED',
  };
}
