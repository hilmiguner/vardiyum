import { getDatabase } from './database';
import { customBreakSourcePeriods } from '../domain/custom-pay-break-audit';
import {
  appendCustomPayBreakRevision,
  CUSTOM_BREAK_WORK_SQL,
  readCustomPayBreakHistory,
  workFromCustomBreakRow,
  type CustomBreakWorkRow,
  type CustomPayBreakSave,
} from '../domain/custom-pay-break-store';
import { validateEarningsWork } from '../domain/earnings-engine';
import { customPayPeriodBounds, payPeriodForDate } from '../domain/pay-period';
import { readPayPeriodStartDay } from '../domain/pay-period-settings';
import { calendarDateInZone } from '../domain/shift-engine';

/** Atomic revision insert and matching head, no work/legacy finance mutation. */
export async function saveCustomPayBreakRevision(
  input: Omit<CustomPayBreakSave, 'recordedAt'>,
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await appendCustomPayBreakRevision(tx, {
      ...input,
      recordedAt: new Date().toISOString(),
    });
  });
}

export interface CustomPayBreakCandidate {
  workId: string;
  startDay: number;
  startPeriodKey: string;
  originalBreakMinutes: number;
  startInstantUtc: string;
  endInstantUtc: string;
  timeZone: string;
  chosenStartMinutes: number | null;
  revision: number;
  recordedAt: string | null;
}

export interface CustomPayBreakCandidateResult {
  startDay: number;
  candidates: CustomPayBreakCandidate[];
}

/**
 * Read-only, preparation-only UI. Existing monthly earnings reports and
 * earnings_month_break_allocations are unchanged by this feature.
 */
export async function loadCustomPayBreakCandidates(
  periodKey: string,
): Promise<CustomPayBreakCandidateResult> {
  const db = await getDatabase();
  const startDay = await readPayPeriodStartDay(db);
  if (startDay === 1) return { startDay, candidates: [] };
  const bounds = customPayPeriodBounds(periodKey, startDay);
  const rows = await db.getAllAsync<CustomBreakWorkRow>(
    CUSTOM_BREAK_WORK_SQL +
      ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
    bounds.endDateInclusive,
    bounds.startDate,
  );
  const candidates: CustomPayBreakCandidate[] = [];
  for (const raw of rows) {
    const work = validateEarningsWork(workFromCustomBreakRow(raw));
    const firstDate = calendarDateInZone(work.timeZone, new Date(work.startInstantUtc));
    const lastDate = calendarDateInZone(
      work.timeZone,
      new Date(Date.parse(work.endInstantUtc) - 1),
    );
    const first = payPeriodForDate(firstDate, startDay);
    const last = payPeriodForDate(lastDate, startDay);
    if (first === last || !work.breakMinutes || (periodKey !== first && periodKey !== last))
      continue;
    customBreakSourcePeriods(work, startDay);
    const history = await readCustomPayBreakHistory(db, work, startDay);
    const latest = history[history.length - 1];
    candidates.push({
      workId: work.id,
      startDay,
      startPeriodKey: first,
      originalBreakMinutes: work.breakMinutes,
      startInstantUtc: work.startInstantUtc,
      endInstantUtc: work.endInstantUtc,
      timeZone: work.timeZone,
      chosenStartMinutes: latest?.startPeriodBreakMinutes ?? null,
      revision: latest?.revision ?? 0,
      recordedAt: latest?.recordedAt ?? null,
    });
  }
  return { startDay, candidates };
}
