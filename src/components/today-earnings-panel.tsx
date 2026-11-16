import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { loadTodayEarningsSummary } from '../data/today-earnings-repository';
import type { TodayEarningsSummary } from '../domain/today-earnings-summary';
import { formatMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * P0 Today card: one existing, verified earnings report for the selected
 * current pay period. Fail closed on missing/blocked sources; never add
 * calendar-month and custom-period totals or display legal/net payroll.
 */
export function TodayEarningsPanel({ date, timeZone }: { date: string; timeZone: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = usePalette();
  const [loaded, setLoaded] = useState<{
    date: string;
    timeZone: string;
    summary: TodayEarningsSummary;
  } | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoaded(null);
      setError(false);
      void loadTodayEarningsSummary(date, timeZone)
        .then((summary) => {
          if (active) setLoaded({ date, timeZone, summary });
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
      };
    }, [date, timeZone, revision]),
  );

  const summary = loaded?.date === date && loaded.timeZone === timeZone ? loaded.summary : null;
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';

  return (
    <Panel>
      <Heading>{t('todayEarningsTitle')}</Heading>
      {error ? (
        <>
          <Muted>{t('todayEarningsError')}</Muted>
          <Action label={t('retry')} onPress={() => setRevision((before) => before + 1)} />
        </>
      ) : !summary ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          <Muted>
            {t(
              summary.period.mode === 'calendar'
                ? 'todayEarningsCalendarPeriod'
                : 'todayEarningsCustomPeriod',
              {
                from: summary.period.startDate,
                to: summary.period.endDateInclusive,
              },
            )}
          </Muted>
          {summary.status === 'estimated' ? (
            <>
              <Text
                accessibilityRole="text"
                style={{ color: c.text, fontSize: 27, fontWeight: '800' }}
              >
                {formatMoneyMinor(summary.totalMinorUnits, summary.currency, locale)}
              </Text>
              {summary.model === 'monthly_fixed' && summary.period.mode === 'calendar' ? (
                <Muted>{t('todayEarningsFixedAssumption')}</Muted>
              ) : null}
            </>
          ) : (
            <Muted>
              {t(
                summary.status === 'needs_profile'
                  ? 'todayEarningsNeedsProfile'
                  : summary.status === 'no_entries'
                    ? 'todayEarningsNoEntries'
                    : 'todayEarningsBlocked',
              )}
            </Muted>
          )}
          <Muted>{t('todayEarningsDisclaimer')}</Muted>
        </>
      )}
      <Action label={t('todayEarningsViewDetails')} onPress={() => router.push('/earnings')} />
    </Panel>
  );
}
