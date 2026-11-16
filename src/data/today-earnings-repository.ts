import { loadCustomPayCombinedEstimate } from './custom-pay-combined-repository';
import { loadEarningsReport } from './earnings-repository';
import { loadPayPeriodStartDay } from './pay-period-repository';
import {
  loadTodayEarningsFromSources,
  type TodayEarningsSummary,
} from '../domain/today-earnings-summary';

/**
 * No new payroll engine or cache. Read the current settings, dispatch ONLY to
 * the relevant existing source-verified report, then recheck the preference.
 * Any invalid/stale source stays blocked; no independent totals are added.
 */
export async function loadTodayEarningsSummary(
  date: string,
  scheduleTimeZone: string,
): Promise<TodayEarningsSummary> {
  return loadTodayEarningsFromSources(date, scheduleTimeZone, {
    readStartDay: loadPayPeriodStartDay,
    readMonth: loadEarningsReport,
    readCustom: loadCustomPayCombinedEstimate,
  });
}
