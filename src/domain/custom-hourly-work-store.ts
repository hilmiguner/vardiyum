import { customBreakSourcePeriods, type CustomPayBreakEvent } from './custom-pay-break-audit.ts';
import { dualBoundarySource } from './dual-boundary-break-audit.ts';
import { readDualBoundaryHistory } from './dual-boundary-break-store.ts';
import {
  CUSTOM_BREAK_WORK_SQL,
  readCustomPayBreakHistory,
  workFromCustomBreakRow,
  type CustomBreakWorkRow,
} from './custom-pay-break-store.ts';
import {
  estimateCustomHourlyWork,
  type CustomHourlyEstimate,
  type CustomHourlySource,
} from './custom-hourly-work-estimate.ts';
import { loadCustomPayProfilePreviewFromStore } from './custom-pay-profile-preview-store.ts';
import { validateEarningsWork } from './earnings-engine.ts';
import { customPayPeriodBounds, payPeriodForDate } from './pay-period.ts';
import { readPayPeriodStartDay } from './pay-period-settings.ts';
import { rateBreakSource } from './rate-boundary-break-audit.ts';
import { readRateBreakHistory } from './rate-boundary-break-store.ts';
import { calendarDateInZone } from './shift-engine.ts';

export interface CustomHourlyReportStore {
  getFirstAsync<T>(sql: string, ...params: string[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: (string | number)[]): Promise<T[]>;
}

/**
 * Snapshot-consistent, read-only report of USER-REPORTED ACTUAL WORK ONLY.
 * All reads use the same exclusive SQLite transaction connection. No new
 * database schema, adjustment attribution or automatic mixed-rate policy.
 */
export async function loadCustomHourlyEstimateFromStore(
  store: CustomHourlyReportStore,
  periodKey: string,
  scheduleTimeZone: string,
): Promise<CustomHourlyEstimate> {
  const plan = await loadCustomPayProfilePreviewFromStore(store, periodKey, scheduleTimeZone);
  if (plan.startDay === 1) {
    return { status: 'disabled', periodKey, startDay: 1, reasons: [] };
  }
  const bounds = customPayPeriodBounds(periodKey, plan.startDay);
  const [workRows, adjustments] = await Promise.all([
    store.getAllAsync<CustomBreakWorkRow>(
      CUSTOM_BREAK_WORK_SQL +
        ' WHERE local_date <= ? AND end_date >= ? ORDER BY start_instant_utc,id',
      bounds.endDateInclusive,
      bounds.startDate,
    ),
    store.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM earnings_adjustments WHERE period_key IN (?, ?)',
      bounds.startDate.slice(0, 7),
      bounds.endDateInclusive.slice(0, 7),
    ),
  ]);

  const sources: CustomHourlySource[] = [];
  for (const raw of workRows) {
    const work = validateEarningsWork(workFromCustomBreakRow(raw));
    let latestPeriodBreak: CustomPayBreakEvent | undefined;
    const firstDate = calendarDateInZone(work.timeZone, new Date(work.startInstantUtc));
    const lastDate = calendarDateInZone(
      work.timeZone,
      new Date(Date.parse(work.endInstantUtc) - 1),
    );
    if (
      payPeriodForDate(firstDate, plan.startDay) !==
        payPeriodForDate(lastDate, plan.startDay) &&
      work.breakMinutes > 0
    ) {
      customBreakSourcePeriods(work, plan.startDay);
      const history = await readCustomPayBreakHistory(store, work, plan.startDay);
      const latest = history[history.length - 1];
      latestPeriodBreak = latest;
      sources.push({
        work,
        allocation: latest,
        auditRevision: latest?.revision,
      });
    } else {
      sources.push({ work });
    }

    // Only fully-contained work segments may acquire a rate-break audit.
    // Crossing the pay period as well needs an independent product decision.
    if (
      plan.status === 'profile_transition_review_required' &&
      plan.segments.length === 2 &&
      work.breakMinutes > 0
    ) {
      const rateDate = plan.segments[1].startDate;
      try {
        rateBreakSource(work, plan.startDay, periodKey, rateDate);
        const history = await readRateBreakHistory(
          store,
          work,
          plan.startDay,
          periodKey,
          rateDate,
        );
        sources[sources.length - 1].rateBreakAudit = history[history.length - 1];
      } catch (error) {
        if (
          !(error instanceof Error) ||
          ![
            'RATE_BREAK_REQUIRES_SINGLE_PAY_PERIOD_WORK',
            'PAY_PERIOD_BREAK_ALLOCATION_REQUIRED',
            'WORK_NOT_CROSS_RATE_BOUNDARY',
          ].includes(error.message)
        )
          throw error;
      }

      if (latestPeriodBreak) {
        try {
          dualBoundarySource(
            work, plan.startDay, periodKey, rateDate, latestPeriodBreak,
          );
          const history = await readDualBoundaryHistory(
            store, work, plan.startDay, periodKey, rateDate,
          );
          sources[sources.length - 1].dualBreakAudit = history[history.length - 1];
        } catch (error) {
          if (
            !(error instanceof Error) ||
            ![
              'DUAL_BREAK_RATE_NOT_IN_PAY_PORTION',
              'DUAL_BREAK_REQUIRES_BREAK_IN_RATE_PORTION',
            ].includes(error.message)
          ) throw error;
        }
      }
    }
  }

  // Protect against a changed preference while a report is being assembled.
  if ((await readPayPeriodStartDay(store)) !== plan.startDay)
    throw new Error('CUSTOM_PAY_SETTING_CHANGED_DURING_REPORT');
  return estimateCustomHourlyWork(plan, sources, adjustments?.n ?? -1);
}
