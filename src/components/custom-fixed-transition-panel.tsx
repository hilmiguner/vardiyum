import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadFixedTransitionBaseReview,
  saveFixedTransitionBaseChoice,
} from '../data/custom-fixed-transition-repository';
import type { FixedTransitionBaseReview } from '../domain/custom-fixed-transition-store';
import { formatMoneyMinor, parseMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/** BASE source declaration only; mixed fixed overtime and combined pay stay blocked. */
export function CustomFixedTransitionPanel({
  periodKey,
  timeZone,
  refreshRevision,
  onSaved,
}: {
  periodKey: string;
  timeZone: string;
  refreshRevision: number;
  onSaved?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const c = usePalette();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const [report, setReport] = useState<FixedTransitionBaseReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      setFirst('');
      setSecond('');
      setReason('');
      void loadFixedTransitionBaseReview(periodKey, timeZone)
        .then((value) => {
          if (active) setReport(value);
        })
        .catch((failure: unknown) => {
          if (active)
            setError(
              failure instanceof Error ? failure.message : 'FIXED_TRANSITION_READ_FAILED',
            );
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refreshRevision, reload]),
  );

  async function save() {
    if (busy || report?.status !== 'review') return;
    try {
      const amounts = [parseMoneyMinor(first), parseMoneyMinor(second)] as [number, number];
      if (
        amounts.some(
          (amount, index) =>
            amount < 0 || amount > report.segments[index].sourceFullBaseMinorUnits,
        )
      )
        throw new Error('INVALID_FIXED_TRANSITION_SEGMENT_AMOUNT');
      if (reason.trim().length < 3 || reason.trim().length > 160)
        throw new Error('INVALID_FIXED_TRANSITION_REASON');
      setBusy(true);
      await saveFixedTransitionBaseChoice({
        periodKey,
        startDay: report.startDay,
        scheduleTimeZone: timeZone,
        declaredBaseMinorUnits: amounts,
        reason,
        expectedRevision: report.latestRevision,
      });
      setReload((v) => v + 1);
      onSaved?.();
      Alert.alert(t('earnFixedTransitionSaved'));
    } catch (failure) {
      Alert.alert(
        t('earnFixedTransitionSaveFailed'),
        failure instanceof Error ? failure.message : 'FIXED_TRANSITION_SAVE_FAILED',
      );
    } finally {
      setBusy(false);
    }
  }

  if (report?.status === 'not_applicable' && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnFixedTransitionTitle')}</Heading>
      <Muted>{t('earnFixedTransitionExplanation')}</Muted>
      {error ? (
        <Text style={{ color: c.danger }}>{error}</Text>
      ) : !report ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status === 'blocked' ? (
        <>
          <Text style={{ color: c.danger, fontWeight: '700' }}>
            {t('earnFixedTransitionBlocked')}
          </Text>
          {report.reasons.map((code) => (
            <Muted key={code}>{code}</Muted>
          ))}
        </>
      ) : (
        <>
          <Muted>
            {t('earnFixedTransitionPeriod', {
              start: report.startDate,
              end: report.endDateInclusive,
              zone: report.timeZone,
            })}
          </Muted>
          {report.stale ? (
            <Text style={{ color: c.danger, fontWeight: '700' }}>
              {t('earnFixedTransitionStale')}
            </Text>
          ) : null}
          {report.segments.map((segment, index) => (
            <View key={segment.profileId + ':' + segment.startInstantUtc} style={{ gap: 5 }}>
              <Heading>
                {t('earnFixedTransitionSegment', {
                  index: index + 1,
                  start: segment.startDate,
                  end: segment.endDateInclusive,
                })}
              </Heading>
              <Muted>
                {t('earnFixedTransitionProfile', {
                  id: segment.profileId,
                  revision: segment.profileRevision,
                  amount: formatMoneyMinor(
                    segment.sourceFullBaseMinorUnits,
                    report.currency,
                    locale,
                  ),
                })}
              </Muted>
              <Muted>
                {segment.startInstantUtc} → {segment.endInstantUtc}
              </Muted>
              {segment.declaredBaseMinorUnits !== null ? (
                <Muted>
                  {t('earnFixedTransitionPreviouslyDeclared', {
                    amount: formatMoneyMinor(
                      segment.declaredBaseMinorUnits,
                      report.currency,
                      locale,
                    ),
                  })}
                </Muted>
              ) : null}
              <TextInput
                accessibilityLabel={t('earnFixedTransitionInput', {
                  index: index + 1,
                  currency: report.currency,
                })}
                value={index === 0 ? first : second}
                onChangeText={index === 0 ? setFirst : setSecond}
                keyboardType="decimal-pad"
                autoCorrect={false}
                maxLength={16}
                placeholder="0,00"
                placeholderTextColor={c.muted}
                style={{
                  color: c.text,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  padding: 12,
                }}
              />
            </View>
          ))}
          {report.declaredBaseTotalMinorUnits !== null ? (
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 20 }}>
              {t('earnFixedTransitionDeclaredTotal', {
                amount: formatMoneyMinor(
                  report.declaredBaseTotalMinorUnits,
                  report.currency,
                  locale,
                ),
                revision: report.latestRevision,
              })}
            </Text>
          ) : (
            <Muted>{t('earnFixedTransitionNeedsDecision')}</Muted>
          )}
          <Muted>{t('earnFixedTransitionReason')}</Muted>
          <TextInput
            accessibilityLabel={t('earnFixedTransitionReason')}
            value={reason}
            onChangeText={setReason}
            maxLength={160}
            placeholder={t('earnFixedTransitionReasonPlaceholder')}
            placeholderTextColor={c.muted}
            style={{
              color: c.text,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              padding: 12,
            }}
          />
          <Action
            label={t('earnFixedTransitionSave')}
            disabled={busy || !first.trim() || !second.trim() || reason.trim().length < 3}
            onPress={() => void save()}
          />
        </>
      )}
      <Muted>{t('earnFixedTransitionNotPayslip')}</Muted>
    </Panel>
  );
}
