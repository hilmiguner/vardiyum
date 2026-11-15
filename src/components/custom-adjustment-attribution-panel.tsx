import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadCustomAdjustmentReport,
  saveCustomAdjustmentSplit,
} from '../data/custom-adjustment-attribution-repository';
import type { CustomAdjustmentCandidate } from '../domain/custom-adjustment-attribution-store';
import {
  formatMoneyMinor,
  minorUnitsToInput,
  parseMoneyMinor,
} from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/** Existing monthly adjustment is immutable; this is a separate, auditable
 * allocation across adjacent CUSTOM periods. Never edits or double-creates it.
 */
export function CustomAdjustmentAttributionPanel({
  periodKey,
  refreshRevision,
  onSaved,
}: {
  periodKey: string;
  refreshRevision: number;
  onSaved?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const palette = usePalette();
  const [report, setReport] = useState<
    Awaited<ReturnType<typeof loadCustomAdjustmentReport>> | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      void loadCustomAdjustmentReport(periodKey)
        .then((value) => {
          if (active) setReport(value);
        })
        .catch((failure: unknown) => {
          if (active)
            setError(
              failure instanceof Error ? failure.message : 'CUSTOM_ADJUSTMENT_READ_FAILED',
            );
        });
      return () => {
        active = false;
      };
    }, [periodKey, refreshRevision, reload]),
  );

  const save = async (candidate: CustomAdjustmentCandidate) => {
    if (report?.status === 'disabled' || !report) return;
    const entered = amounts[candidate.adjustmentId] ??
      (candidate.earlierMinorUnits === null
        ? ''
        : minorUnitsToInput(candidate.earlierMinorUnits));
    const reason = reasons[candidate.adjustmentId] ?? '';
    try {
      if (!entered || reason.trim().length < 3 || reason.trim().length > 160)
        throw new Error('CUSTOM_ADJUSTMENT_INPUT_REQUIRED');
      const earlierMinorUnits = parseMoneyMinor(entered);
      if (candidate.originalMinorUnits > 0 &&
          (earlierMinorUnits < 0 || earlierMinorUnits > candidate.originalMinorUnits))
        throw new Error('CUSTOM_ADJUSTMENT_SPLIT_EXCEEDS_SOURCE');
      if (candidate.originalMinorUnits < 0 &&
          (earlierMinorUnits > 0 || earlierMinorUnits < candidate.originalMinorUnits))
        throw new Error('CUSTOM_ADJUSTMENT_SPLIT_EXCEEDS_SOURCE');
      setSavingId(candidate.adjustmentId);
      await saveCustomAdjustmentSplit({
        adjustmentId: candidate.adjustmentId,
        startDay: report.startDay,
        earlierMinorUnits,
        expectedRevision: candidate.revision,
        reason,
      });
      setAmounts((previous) => {
        const next = { ...previous };
        delete next[candidate.adjustmentId];
        return next;
      });
      setReasons((previous) => {
        const next = { ...previous };
        delete next[candidate.adjustmentId];
        return next;
      });
      setReload((old) => old + 1);
      onSaved?.();
      Alert.alert(t('earnAttribSaved'));
    } catch (failure) {
      Alert.alert(
        t('earnAttribInvalid'),
        failure instanceof Error ? failure.message : '',
      );
    } finally {
      setSavingId(null);
    }
  };

  if (report?.status === 'disabled' && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnAttribTitle')}</Heading>
      <Muted>{t('earnAttribExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !report ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status !== 'disabled' ? (
        <>
          <Muted>
            {t('earnAttribPeriod', {
              start: report.startDate,
              end: report.endDateInclusive,
            })}
          </Muted>
          {report.status === 'empty' ? (
            <Muted>{t('earnAttribEmpty')}</Muted>
          ) : (
            <>
              {report.pendingCount > 0 ? (
                <Text style={{ color: palette.danger }}>
                  {t('earnAttribPending', { count: report.pendingCount })}
                </Text>
              ) : (
                <>
                  <Muted>{t('earnAttribVerified')}</Muted>
                  {report.totals.map(({ currency, minorUnits }) => (
                    <Text
                      key={currency}
                      style={{ fontSize: 20, fontWeight: '700', color: palette.text }}
                    >
                      {formatMoneyMinor(minorUnits, currency, locale)}
                    </Text>
                  ))}
                </>
              )}
              {report.candidates.map((candidate) => (
                <View
                  key={candidate.adjustmentId}
                  style={{
                    gap: 8,
                    borderBottomWidth: 1,
                    borderColor: palette.border,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: palette.text, fontWeight: '700' }}>
                    {t('earnAttribSource', {
                      kind: t('earnAttribKind_' + candidate.kind),
                      amount: formatMoneyMinor(
                        candidate.originalMinorUnits,
                        candidate.currency,
                        locale,
                      ),
                    })}
                  </Text>
                  <Muted>
                    {candidate.adjustmentId} · {candidate.sourceCalendarMonth}
                  </Muted>
                  <Muted>{candidate.note}</Muted>
                  <Muted>
                    {t('earnAttribPeriods', {
                      earlier: candidate.earlierPeriodKey,
                      later: candidate.laterPeriodKey,
                    })}
                  </Muted>
                  {candidate.stale ? (
                    <Text style={{ color: palette.danger }}>
                      {t('earnAttribStale')}
                    </Text>
                  ) : candidate.earlierMinorUnits !== null &&
                    candidate.laterMinorUnits !== null ? (
                    <Muted>
                      {t('earnAttribSavedAmounts', {
                        earlier: formatMoneyMinor(
                          candidate.earlierMinorUnits,
                          candidate.currency,
                          locale,
                        ),
                        later: formatMoneyMinor(
                          candidate.laterMinorUnits,
                          candidate.currency,
                          locale,
                        ),
                        current: formatMoneyMinor(
                          candidate.amountInSelectedPeriodMinorUnits!,
                          candidate.currency,
                          locale,
                        ),
                      })}
                    </Muted>
                  ) : null}
                  <Muted>
                    {t('earnAttribEarlierAmount', {
                      period: candidate.earlierPeriodKey,
                      currency: candidate.currency,
                    })}
                  </Muted>
                  <TextInput
                    accessibilityLabel={t('earnAttribEarlierAmount', {
                      period: candidate.earlierPeriodKey,
                      currency: candidate.currency,
                    })}
                    keyboardType="decimal-pad"
                    value={
                      amounts[candidate.adjustmentId] ??
                      (candidate.earlierMinorUnits === null
                        ? ''
                        : minorUnitsToInput(candidate.earlierMinorUnits))
                    }
                    onChangeText={(value) =>
                      setAmounts((old) => ({ ...old, [candidate.adjustmentId]: value }))
                    }
                    maxLength={17}
                    placeholder={candidate.originalMinorUnits < 0 ? '-0.00' : '0.00'}
                    placeholderTextColor={palette.muted}
                    style={{
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 12,
                      padding: 12,
                      color: palette.text,
                    }}
                  />
                  <Muted>
                    {t('earnAttribRemainder', { period: candidate.laterPeriodKey })}
                  </Muted>
                  <Muted>{t('earnAttribReason')}</Muted>
                  <TextInput
                    accessibilityLabel={t('earnAttribReason')}
                    value={reasons[candidate.adjustmentId] ?? ''}
                    onChangeText={(value) =>
                      setReasons((old) => ({ ...old, [candidate.adjustmentId]: value }))
                    }
                    maxLength={160}
                    placeholder={t('earnAttribReasonPlaceholder')}
                    placeholderTextColor={palette.muted}
                    style={{
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 12,
                      padding: 12,
                      color: palette.text,
                    }}
                  />
                  <Muted>
                    {t('earnAttribRevision', { revision: candidate.revision })}
                  </Muted>
                  <Action
                    label={t('earnAttribSave')}
                    disabled={savingId !== null}
                    onPress={() => void save(candidate)}
                  />
                </View>
              ))}
            </>
          )}
        </>
      ) : null}
      <Muted>{t('earnAttribSeparate')}</Muted>
    </Panel>
  );
}
