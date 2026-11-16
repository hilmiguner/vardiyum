import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { loadCustomPayCombinedEstimate } from '../data/custom-pay-combined-repository';
import type { CustomPayCombinedEstimate } from '../domain/custom-pay-combined';
import { formatMoneyMinor } from '../domain/money-text';
import {
  createCustomPayCombinedExport,
  requireUnchangedCustomPayEstimate,
} from '../domain/custom-pay-export';
import type { EarningsExportFormat } from '../domain/earnings-export';
import { shareCustomPayExportFile } from '../services/custom-pay-export-files';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * One coherent, read-only SPECIAL-period estimate. No user-controlled
 * arithmetic, automatic prorating, net/tax, or export before privacy consent.
 */
export function CustomPayCombinedPanel({
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
  const [report, setReport] = useState<CustomPayCombinedEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      void loadCustomPayCombinedEstimate(periodKey, timeZone)
        .then((result) => {
          if (active) setReport(result);
        })
        .catch((failure: unknown) => {
          if (active)
            setError(
              failure instanceof Error ? failure.message : 'CUSTOM_COMBINED_READ_FAILED',
            );
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refreshRevision]),
  );

  const requestExport = (format: EarningsExportFormat) => {
    if (exportBusy || report?.status !== 'estimated') return;
    const reviewed = report;
    Alert.alert(
      t('earnCustomExportPrivacyTitle'),
      t('earnCustomExportPrivacyBody', {
        from: reviewed.startDate,
        to: reviewed.endDateInclusive,
        total: formatMoneyMinor(reviewed.totalMinorUnits, reviewed.currency, locale),
        work: reviewed.workLines.length,
        adjustments: reviewed.adjustmentLines.length,
      }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('earnCustomExportConfirm'),
          onPress: () => {
            setExportBusy(true);
            void (async () => {
              // A new coherent SQLite snapshot is required AFTER confirmation.
              // Never share an old display or a newly changed unreviewed total.
              const fresh = await loadCustomPayCombinedEstimate(periodKey, timeZone);
              if (
                fresh.status !== 'estimated' ||
                JSON.stringify(fresh) !== JSON.stringify(reviewed)
              )
                setReport(fresh);
              const verified = requireUnchangedCustomPayEstimate(reviewed, fresh);
              await shareCustomPayExportFile(createCustomPayCombinedExport(verified, format));
            })()
              .catch((failure: unknown) => {
                Alert.alert(
                  t('earnCustomExportFailed'),
                  failure instanceof Error ? failure.message : 'CUSTOM_PAY_EXPORT_FAILED',
                );
              })
              .finally(() => setExportBusy(false));
          },
        },
      ],
    );
  };

  if (report?.status === 'disabled' && !error) return null;
  const money = (value: number, currency: string) => formatMoneyMinor(value, currency, locale);
  return (
    <Panel>
      <Heading>{t('earnCombinedTitle')}</Heading>
      <Muted>{t('earnCombinedExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !report ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status === 'blocked' ? (
        <>
          <Text style={{ color: palette.danger, fontWeight: '700' }}>
            {t('earnCombinedBlocked')}
          </Text>
          {report.reasons.map((reason) => (
            <Muted key={reason}>{reason}</Muted>
          ))}
        </>
      ) : report.status === 'estimated' ? (
        <>
          <Muted>
            {t('earnCombinedPeriod', {
              from: report.startDate,
              to: report.endDateInclusive,
              day: report.startDay,
              zone: report.scheduleTimeZone,
            })}
          </Muted>
          <Muted>
            {t('earnCombinedModel', {
              mode: t(
                report.model === 'hourly_actual_work'
                  ? 'earnCombinedHourly'
                  : 'earnCombinedFixed',
              ),
            })}
          </Muted>
          <Muted>{t('earnCombinedTotalLabel')}</Muted>
          <Text
            accessibilityRole="text"
            style={{
              color: palette.text,
              fontSize: 27,
              fontWeight: '800',
            }}
          >
            {money(report.totalMinorUnits, report.currency)}
          </Text>
          <Muted>
            {t('earnCombinedBase', {
              amount: money(report.fixedBaseMinorUnits, report.currency),
            })}
          </Muted>
          <Muted>
            {t('earnCombinedRegular', {
              amount: money(report.regularWorkMinorUnits, report.currency),
            })}
          </Muted>
          <Muted>
            {t('earnCombinedOvertime', {
              amount: money(report.overtimeMinorUnits, report.currency),
            })}
          </Muted>
          <Muted>
            {t('earnCombinedAdjustment', {
              amount: money(report.adjustmentMinorUnits, report.currency),
            })}
          </Muted>
          <Muted>
            {t('earnCombinedTrace', {
              baseRev: report.baseRevision ?? '-',
              otRev: report.overtimeConsentRevision ?? '-',
              otPolicy: report.overtimeDecision,
              netSeconds: report.loggedSeconds,
              overtimeSeconds: report.overtimeSeconds,
            })}
          </Muted>
          <Heading>{t('earnCombinedProfileSources')}</Heading>
          {report.profiles.map((profile) => (
            <Muted key={profile.id + ':' + profile.revision}>
              {t('earnCombinedProfile', { id: profile.id, revision: profile.revision })}
            </Muted>
          ))}
          <Heading>{t('earnCombinedWorkSources')}</Heading>
          {report.workLines.length ? (
            report.workLines.map((line, index) => (
              <View
                key={line.workId + ':' + line.kind + ':' + index}
                style={{
                  paddingVertical: 8,
                  gap: 4,
                  borderBottomWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Muted>
                  {t('earnCombinedWorkLine', {
                    kind: t('earnCombinedWork_' + line.kind),
                    id: line.workId,
                    amount: money(line.amountMinorUnits, report.currency),
                    seconds: line.seconds,
                    profile: line.profileId,
                    revision: line.profileRevision,
                    audit: line.breakAuditRevision ?? '-',
                    rateAudit: line.rateBreakAuditRevision ?? '-',
                  })}
                </Muted>
                <Muted>
                  {line.segmentStartUtc} → {line.segmentEndUtc} ({line.timeZone})
                </Muted>
                <Muted>
                  {t('earnCombinedWorkOrigin', {
                    from: line.sourceStartUtc,
                    to: line.sourceEndUtc,
                  })}
                </Muted>
              </View>
            ))
          ) : (
            <Muted>{t('earnCombinedNoWorkRows')}</Muted>
          )}
          <Heading>{t('earnCombinedAdjustmentSources')}</Heading>
          {report.adjustmentLines.length ? (
            report.adjustmentLines.map((line) => (
              <View
                key={line.sourceId}
                style={{
                  paddingVertical: 8,
                  gap: 4,
                  borderBottomWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Muted>
                  {t('earnCombinedAdjustmentLine', {
                    id: line.sourceId,
                    kind: t('earnAttribKind_' + line.sourceKind),
                    amount: money(line.selectedMinorUnits, line.sourceCurrency),
                    sourceAmount: money(line.sourceAmountMinorUnits, line.sourceCurrency),
                    month: line.sourceCalendarMonth,
                    revision: line.attributionRevision,
                  })}
                </Muted>
                <Muted>
                  {t('earnCombinedAdjustmentPeriodSplit', {
                    earlier: line.earlierPeriodKey,
                    earlierAmount: money(line.earlierMinorUnits, line.sourceCurrency),
                    later: line.laterPeriodKey,
                    laterAmount: money(line.laterMinorUnits, line.sourceCurrency),
                  })}
                </Muted>
                <Muted>{line.sourceNote}</Muted>
                <Muted>
                  {t('earnCombinedAuditReason', {
                    reason: line.attributionReason,
                    recordedAt: line.attributionRecordedAt,
                  })}
                </Muted>
              </View>
            ))
          ) : (
            <Muted>{t('earnCombinedNoAdjustmentRows')}</Muted>
          )}
          <Heading>{t('earnCustomExportHeading')}</Heading>
          <Muted>{t('earnCustomExportHint')}</Muted>
          <Action
            disabled={exportBusy}
            label={t('earnCustomExportCsv')}
            onPress={() => requestExport('csv')}
          />
          <Action
            disabled={exportBusy}
            label={t('earnCustomExportJson')}
            onPress={() => requestExport('json')}
          />
        </>
      ) : null}
      <Muted>{t('earnCombinedNotPayslip')}</Muted>
    </Panel>
  );
}
