import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { loadCustomHourlyEstimate } from '../data/custom-hourly-work-repository';
import type { CustomHourlyEstimate } from '../domain/custom-hourly-work-estimate';
import { formatMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Heading, Muted, Panel } from './ui';

/**
 * Separate work-only estimate. The original calendar-month Earnings report,
 * adjustments, monthly break audit and exports are still unchanged.
 */
export function CustomHourlyEstimatePanel({
  periodKey,
  timeZone,
  refreshRevision,
}: {
  periodKey: string;
  timeZone: string;
  refreshRevision: number;
}) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const [report, setReport] = useState<CustomHourlyEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      void loadCustomHourlyEstimate(periodKey, timeZone)
        .then((next) => {
          if (active) setReport(next);
        })
        .catch((reason: unknown) => {
          if (active)
            setError(
              reason instanceof Error ? reason.message : 'CUSTOM_HOURLY_ESTIMATE_FAILED',
            );
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refreshRevision]),
  );

  if (report?.status === 'disabled' && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnCustomHourlyTitle')}</Heading>
      <Muted>{t('earnCustomHourlyScope')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : report === null ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status === 'estimated' ? (
        <>
          <Muted>
            {t('earnCustomHourlyPeriod', {
              start: report.startDate,
              end: report.endDateInclusive,
            })}
          </Muted>
          <Text
            accessibilityRole="text"
            style={{ fontSize: 25, fontWeight: '800', color: palette.text }}
          >
            {formatMoneyMinor(report.workOnlyMinorUnits, report.currency, locale)}
          </Text>
          <Muted>
            {t('earnCustomHourlyTotals', {
              minutes: Math.floor(report.loggedSeconds / 60),
              overtime: Math.floor(report.overtimeSeconds / 60),
            })}
          </Muted>
          <Muted>
            {report.profileCount === 1
              ? t('earnCustomHourlyProfile', {
                  profile: report.profileId,
                  revision: report.profileRevision,
                })
              : t('earnCustomHourlyMixedRates', { count: report.profileCount })}
          </Muted>
          <Heading>{t('earnCustomHourlySources')}</Heading>
          {report.lines.map((line, index) => (
            <View
              key={line.workId + ':' + line.kind + ':' + index}
              style={{
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
                gap: 5,
              }}
            >
              <Text style={{ color: palette.text, fontWeight: '700' }}>
                {t('earnCustomHourlyKind_' + line.kind)} ·{' '}
                {formatMoneyMinor(line.amountMinorUnits, report.currency, locale)}
              </Text>
              <Muted>
                {t('earnCustomHourlyLineProfile', {
                  profile: line.profileId,
                  revision: line.profileRevision,
                })}
              </Muted>
              <Muted>
                {t('earnCustomHourlyLine', {
                  work: line.workId,
                  seconds: line.seconds,
                  breakMinutes: line.sourceBreakMinutes,
                  revision: line.breakAuditRevision ?? '-',
                })}
              </Muted>
              {line.rateBreakAuditRevision ? (
                <Muted>
                  {t(
                    line.rateBreakAuditKind === 'dual'
                      ? 'earnDualBreakLineAudit'
                      : 'earnRateBreakLineAudit',
                    { revision: line.rateBreakAuditRevision },
                  )}
                </Muted>
              ) : null}
              <Muted>
                {line.segmentStartUtc} → {line.segmentEndUtc} ({line.timeZone})
              </Muted>
              <Muted>
                {t('earnCustomHourlyOriginal', {
                  start: line.sourceStartUtc,
                  end: line.sourceEndUtc,
                })}
              </Muted>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={{ color: palette.danger, fontWeight: '700' }}>
            {t('earnCustomHourlyStatus_' + report.status)}
          </Text>
          {report.reasons.map((reason, index) => (
            <Muted key={reason + ':' + index}>{reason}</Muted>
          ))}
        </>
      )}
      <Muted>{t('earnCustomHourlyNotPayslip')}</Muted>
    </Panel>
  );
}
