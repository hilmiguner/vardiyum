import type { CustomPayCombinedEstimate } from './custom-pay-combined.ts';
import type { EarningsReport } from './earnings-engine.ts';
import { customPayPeriodBounds, payPeriodForDate } from './pay-period.ts';

export interface TodayEarningsPeriod {
  mode: 'calendar' | 'custom';
  periodKey: string;
  startDay: number;
  startDate: string;
  endDateInclusive: string;
}

/** Use the SCHEDULE zone's already resolved civil date, never the phone's month. */
export function todayEarningsPeriod(date: string, startDay: number): TodayEarningsPeriod {
  const periodKey = payPeriodForDate(date, startDay);
  const bounds = customPayPeriodBounds(periodKey, startDay);
  return {
    mode: startDay === 1 ? 'calendar' : 'custom',
    periodKey,
    startDay,
    startDate: bounds.startDate,
    endDateInclusive: bounds.endDateInclusive,
  };
}

export type TodayEarningsSummary =
  | {
      status: 'estimated';
      period: TodayEarningsPeriod;
      totalMinorUnits: number;
      currency: string;
      model: 'hourly' | 'monthly_fixed';
      disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE';
    }
  | {
      status: 'blocked' | 'needs_profile' | 'no_entries';
      period: TodayEarningsPeriod;
    };

function blocked(period: TodayEarningsPeriod): TodayEarningsSummary {
  return { status: 'blocked', period };
}

function validSummaryMoney(value: number, currency: string): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 1_000_000_000_000 &&
    /^[A-Z]{3}$/.test(currency)
  );
}

/**
 * The report engine is the sole calculator. This is a fail-closed, read-only
 * projection: no pay-period guessing, auto-prorating, totals from independent
 * reports, guessed FX or exception handling that invents an amount.
 */
export function summarizeTodayEarnings(
  period: TodayEarningsPeriod,
  report: EarningsReport | CustomPayCombinedEstimate,
): TodayEarningsSummary {
  if (report.periodKey !== period.periodKey) return blocked(period);
  if (period.mode === 'calendar') {
    if (period.startDay !== 1 || 'startDay' in report) return blocked(period);
    if (report.status === 'needs_profile') return { status: 'needs_profile', period };
    if (report.status !== 'estimated') return blocked(period);
    if (
      report.disclaimer !== 'USER_REPORTED_PRE_TAX_ESTIMATE' ||
      !validSummaryMoney(report.totalMinorUnits, report.profile.currency)
    )
      return blocked(period);
    if (
      report.profile.model === 'hourly' &&
      report.lines.length === 0 &&
      report.totalMinorUnits === 0
    )
      return { status: 'no_entries', period };
    return {
      status: 'estimated',
      period,
      totalMinorUnits: report.totalMinorUnits,
      currency: report.profile.currency,
      model: report.profile.model,
      disclaimer: report.disclaimer,
    };
  }

  if (!('startDay' in report) || report.status !== 'estimated') return blocked(period);
  if (
    report.startDay !== period.startDay ||
    report.startDate !== period.startDate ||
    report.endDateInclusive !== period.endDateInclusive ||
    report.scope !== 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE' ||
    report.disclaimer !== 'USER_REPORTED_PRE_TAX_ESTIMATE' ||
    !validSummaryMoney(report.totalMinorUnits, report.currency)
  )
    return blocked(period);
  if (
    report.model === 'hourly_actual_work' &&
    report.workLines.length === 0 &&
    report.adjustmentLines.length === 0 &&
    report.totalMinorUnits === 0
  )
    return { status: 'no_entries', period };
  return {
    status: 'estimated',
    period,
    totalMinorUnits: report.totalMinorUnits,
    currency: report.currency,
    model: report.model === 'hourly_actual_work' ? 'hourly' : 'monthly_fixed',
    disclaimer: report.disclaimer,
  };
}

export interface TodayEarningsSources {
  readStartDay(): Promise<number>;
  readMonth(periodKey: string): Promise<EarningsReport>;
  readCustom(periodKey: string, scheduleTimeZone: string): Promise<CustomPayCombinedEstimate>;
}

/**
 * Verify the setting again before display; changing the 26th to the 1st
 * during an async read must never label an old custom period as current pay.
 * A fresh focus/retry gets the new setting and source.
 */
export async function loadTodayEarningsFromSources(
  date: string,
  scheduleTimeZone: string,
  sources: TodayEarningsSources,
): Promise<TodayEarningsSummary> {
  const startDay = await sources.readStartDay();
  const period = todayEarningsPeriod(date, startDay);
  const report =
    period.mode === 'calendar'
      ? await sources.readMonth(period.periodKey)
      : await sources.readCustom(period.periodKey, scheduleTimeZone);
  if ((await sources.readStartDay()) !== startDay) return blocked(period);
  return summarizeTodayEarnings(period, report);
}
