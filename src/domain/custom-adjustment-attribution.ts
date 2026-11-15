import {
  periodBounds,
  validateAdjustment,
  type EarningsAdjustment,
} from './earnings-engine.ts';
import { payPeriodForDate } from './pay-period.ts';

export const CUSTOM_ADJUSTMENT_ATTRIBUTION_PREFIX = 'earnings_custom_adjustment_split_v1:';
export const CUSTOM_ADJUSTMENT_ATTRIBUTION_MAX_REVISIONS = 64;

export interface CustomAdjustmentAttributionEvent {
  schema: 1;
  source: 'user_entered';
  startDay: number;
  adjustmentId: string;
  original: EarningsAdjustment;
  earlierPeriodKey: string;
  laterPeriodKey: string;
  earlierMinorUnits: number;
  laterMinorUnits: number;
  revision: number;
  reason: string;
  recordedAt: string;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const STAMP = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export function attributionPrefix(startDay: number, adjustmentId: string): string {
  if (!Number.isSafeInteger(startDay) || startDay < 2 || startDay > 28)
    throw new Error('CUSTOM_ADJUSTMENT_REQUIRES_NONCALENDAR_PERIOD');
  if (!IDENTIFIER.test(adjustmentId)) throw new Error('INVALID_ATTRIBUTION_ADJUSTMENT_ID');
  return CUSTOM_ADJUSTMENT_ATTRIBUTION_PREFIX + startDay + ':' + adjustmentId + ':';
}

export function attributionHeadKey(startDay: number, adjustmentId: string): string {
  return attributionPrefix(startDay, adjustmentId) + 'head';
}

export function attributionEventKey(
  startDay: number,
  adjustmentId: string,
  revision: number,
): string {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    revision > CUSTOM_ADJUSTMENT_ATTRIBUTION_MAX_REVISIONS
  )
    throw new Error('CUSTOM_ADJUSTMENT_REVISION_LIMIT');
  return (
    attributionPrefix(startDay, adjustmentId) + 'event:' + String(revision).padStart(3, '0')
  );
}

export function customAdjustmentCandidatePeriods(
  adjustment: EarningsAdjustment,
  startDay: number,
): { earlierPeriodKey: string; laterPeriodKey: string } {
  const verified = validateAdjustment(adjustment);
  attributionPrefix(startDay, verified.id);
  const { first, last } = periodBounds(verified.periodKey);
  const earlierPeriodKey = payPeriodForDate(first, startDay);
  const laterPeriodKey = payPeriodForDate(last, startDay);
  if (earlierPeriodKey === laterPeriodKey) throw new Error('INVALID_CUSTOM_ADJUSTMENT_PERIODS');
  return { earlierPeriodKey, laterPeriodKey };
}

/**
 * This event represents ONE source calendar-month adjustment, divided across
 * its only two candidate custom pay periods. Splits are explicit, NEVER
 * inferred from day counts, times, shifts or payroll laws.
 */
export function createCustomAdjustmentAttributionEvent(
  original: EarningsAdjustment,
  startDay: number,
  earlierMinorUnits: number,
  revision: number,
  reason: string,
  recordedAt: string,
): CustomAdjustmentAttributionEvent {
  const source = validateAdjustment(original);
  attributionEventKey(startDay, source.id, revision);
  const { earlierPeriodKey, laterPeriodKey } = customAdjustmentCandidatePeriods(
    source,
    startDay,
  );
  if (!Number.isSafeInteger(earlierMinorUnits))
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_SPLIT');
  const originalAmount = source.amountMinorUnits;
  // No sign inversion, over-allocation, or unbounded balancing corrections.
  if (
    (originalAmount > 0 && (earlierMinorUnits < 0 || earlierMinorUnits > originalAmount)) ||
    (originalAmount < 0 && (earlierMinorUnits > 0 || earlierMinorUnits < originalAmount))
  )
    throw new Error('CUSTOM_ADJUSTMENT_SPLIT_EXCEEDS_SOURCE');
  const laterMinorUnits = originalAmount - earlierMinorUnits;
  if (
    !Number.isSafeInteger(laterMinorUnits) ||
    earlierMinorUnits + laterMinorUnits !== originalAmount ||
    (originalAmount > 0 && laterMinorUnits < 0) ||
    (originalAmount < 0 && laterMinorUnits > 0)
  )
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_CONSERVATION');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 160)
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_REASON');
  if (
    typeof recordedAt !== 'string' ||
    !STAMP.test(recordedAt) ||
    !Number.isFinite(Date.parse(recordedAt)) ||
    new Date(Date.parse(recordedAt)).toISOString() !== recordedAt
  )
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_TIMESTAMP');
  return {
    schema: 1,
    source: 'user_entered',
    startDay,
    adjustmentId: source.id,
    original: source,
    earlierPeriodKey,
    laterPeriodKey,
    earlierMinorUnits,
    laterMinorUnits,
    revision,
    reason: reason.trim(),
    recordedAt,
  };
}

/**
 * Every historical event validates its own original source. The application
 * only appends to event keys, with one atomically-updated revision head; this
 * is NOT cryptographic proof against arbitrary direct database modification.
 */
export function decodeCustomAdjustmentAttributionHistory(
  startDay: number,
  adjustmentId: string,
  rows: readonly { key: string; value: string }[],
): CustomAdjustmentAttributionEvent[] {
  const prefix = attributionPrefix(startDay, adjustmentId);
  if (!Array.isArray(rows)) throw new Error('INVALID_CUSTOM_ADJUSTMENT_HISTORY');
  if (rows.length === 0) return [];
  if (rows.length > CUSTOM_ADJUSTMENT_ATTRIBUTION_MAX_REVISIONS + 1)
    throw new Error('CUSTOM_ADJUSTMENT_REVISION_LIMIT');
  const head = rows.filter((row) => row.key === prefix + 'head');
  const records = rows.filter((row) => row.key !== prefix + 'head');
  if (
    head.length !== 1 ||
    !/^[1-9][0-9]*$/.test(head[0].value) ||
    Number(head[0].value) !== records.length ||
    records.length === 0
  )
    throw new Error('INVALID_CUSTOM_ADJUSTMENT_HEAD');
  const history: CustomAdjustmentAttributionEvent[] = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const revision = i + 1;
    if (row.key !== attributionEventKey(startDay, adjustmentId, revision))
      throw new Error('CUSTOM_ADJUSTMENT_EVENT_GAP');
    if (typeof row.value !== 'string' || row.value.length > 2100)
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_EVENT');
    let parsed: CustomAdjustmentAttributionEvent;
    try {
      parsed = JSON.parse(row.value) as CustomAdjustmentAttributionEvent;
    } catch {
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_EVENT');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_EVENT');
    let canonical: CustomAdjustmentAttributionEvent;
    try {
      canonical = createCustomAdjustmentAttributionEvent(
        parsed.original,
        startDay,
        parsed.earlierMinorUnits,
        revision,
        parsed.reason,
        parsed.recordedAt,
      );
    } catch {
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_EVENT');
    }
    if (JSON.stringify(canonical) !== row.value || canonical.adjustmentId !== adjustmentId)
      throw new Error('INVALID_CUSTOM_ADJUSTMENT_EVENT');
    if (history.length) {
      const previous = history[history.length - 1];
      if (
        canonical.recordedAt < previous.recordedAt ||
        canonical.earlierMinorUnits === previous.earlierMinorUnits ||
        JSON.stringify(canonical.original) !== JSON.stringify(previous.original)
      )
        throw new Error('INVALID_CUSTOM_ADJUSTMENT_REVISION');
    }
    history.push(canonical);
  }
  return history;
}
