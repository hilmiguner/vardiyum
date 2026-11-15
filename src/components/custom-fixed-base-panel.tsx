import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadCustomFixedBaseReport,
  saveCustomFixedBaseChoice,
} from '../data/custom-fixed-base-repository';
import type { CustomFixedBaseReport } from '../domain/custom-fixed-base-store';
import type { CustomFixedBaseChoice } from '../domain/custom-fixed-base-policy';
import { formatMoneyMinor, parseMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * One custom-period BASE amount only, not gross total salary or a payslip.
 * Every new or corrected value requires a fresh intentional user selection.
 */
export function CustomFixedBasePanel({
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
  const palette = usePalette();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const [report, setReport] = useState<CustomFixedBaseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<CustomFixedBaseChoice | null>(null);
  const [partial, setPartial] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      setChoice(null);
      setPartial('');
      setReason('');
      void loadCustomFixedBaseReport(periodKey, timeZone)
        .then(value => {
          if (active) setReport(value);
        })
        .catch((e: unknown) => {
          if (active) setError(e instanceof Error ? e.message : 'CUSTOM_FIXED_REPORT_FAILED');
        });
      return () => { active = false; };
    }, [periodKey, timeZone, refreshRevision, reload]),
  );

  const eligible = report?.status === 'estimated' || report?.status === 'requires_choice';
  const save = async () => {
    if (!eligible || !report || !choice) {
      Alert.alert(t('earnFixedInvalid'));
      return;
    }
    let partialBaseMinorUnits: number | null = null;
    try {
      if (choice === 'explicit_partial_base') {
        partialBaseMinorUnits = parseMoneyMinor(partial);
        if (partialBaseMinorUnits < 0 || partialBaseMinorUnits >= report.fullBaseMinorUnits)
          throw new Error('INVALID_FIXED_BASE_PARTIAL_AMOUNT');
      }
      if (reason.trim().length < 3 || reason.trim().length > 160)
        throw new Error('INVALID_FIXED_BASE_REASON');
      setBusy(true);
      await saveCustomFixedBaseChoice({
        periodKey,
        scheduleTimeZone: timeZone,
        startDay: report.startDay,
        choice,
        partialBaseMinorUnits,
        expectedRevision: report.latestRevision,
        reason,
      });
      setReload(old => old + 1);
      onSaved?.();
      Alert.alert(t('earnFixedSaved'));
    } catch (e) {
      Alert.alert(t('earnFixedInvalid'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };

  if (report?.status === 'not_applicable' && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnFixedTitle')}</Heading>
      <Muted>{t('earnFixedExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !report ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status === 'blocked' ? (
        <>
          <Text style={{ color: palette.danger, fontWeight: '700' }}>
            {t('earnFixedBlocked')}
          </Text>
          {report.reasons.map(code => <Muted key={code}>{code}</Muted>)}
        </>
      ) : eligible ? (
        <>
          <Muted>{t('earnFixedPeriod', { start: report.startDate, end: report.endDateInclusive })}</Muted>
          <Muted>{t('earnFixedProfile', {
            profile: report.profileId,
            revision: report.profileRevision,
            amount: formatMoneyMinor(report.fullBaseMinorUnits, report.currency, locale),
          })}</Muted>
          {report.status === 'estimated' ? (
            <>
              <Muted>{t('earnFixedSavedScope')}</Muted>
              <Text accessibilityRole="text" style={{
                color: palette.text, fontSize: 24, fontWeight: '800',
              }}>
                {formatMoneyMinor(report.baseOnlyMinorUnits, report.currency, locale)}
              </Text>
              <Muted>{t('earnFixedSavedChoice', {
                mode: t(report.choice === 'full_base' ? 'earnFixedFull' : 'earnFixedPartial'),
                revision: report.latestRevision,
              })}</Muted>
            </>
          ) : report.stale ? (
            <Text style={{color: palette.danger, fontWeight: '700'}}>
              {t('earnFixedStale')}
            </Text>
          ) : (
            <Muted>{t('earnFixedNeedsChoice')}</Muted>
          )}
          <Muted>{t('earnFixedSelection')}</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['full_base', 'explicit_partial_base'] as const).map(option => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: choice === option }}
                onPress={() => setChoice(option)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: choice === option ? palette.accent : palette.border,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{
                  color: palette.text, fontWeight: choice === option ? '800' : '400',
                  textAlign: 'center',
                }}>
                  {t(option === 'full_base' ? 'earnFixedFull' : 'earnFixedPartial')}
                </Text>
              </Pressable>
            ))}
          </View>
          {choice === 'explicit_partial_base' ? (
            <>
              <Muted>{t('earnFixedAmount', {currency: report.currency})}</Muted>
              <TextInput
                accessibilityLabel={t('earnFixedAmount', {currency: report.currency})}
                value={partial}
                onChangeText={setPartial}
                keyboardType="decimal-pad"
                maxLength={15}
                placeholder="15000,00"
                placeholderTextColor={palette.muted}
                style={{
                  borderWidth: 1, borderColor: palette.border,
                  borderRadius: 12, padding: 12, color: palette.text,
                }}
              />
              <Muted>{t('earnFixedAmountHint')}</Muted>
            </>
          ) : null}
          <Muted>{t('earnFixedReason')}</Muted>
          <TextInput
            accessibilityLabel={t('earnFixedReason')}
            value={reason}
            onChangeText={setReason}
            maxLength={160}
            placeholder={t('earnFixedReasonPlaceholder')}
            placeholderTextColor={palette.muted}
            style={{
              borderWidth: 1, borderColor: palette.border,
              borderRadius: 12, padding: 12, color: palette.text,
            }}
          />
          <Muted>{t('earnFixedRevision', {revision: report.latestRevision})}</Muted>
          <Action
            label={t('earnFixedSave')}
            disabled={busy || !choice}
            onPress={() => void save()}
          />
        </>
      ) : null}
      <Muted>{t('earnFixedNotPayslip')}</Muted>
    </Panel>
  );
}
