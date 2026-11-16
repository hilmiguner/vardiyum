import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadTwoFixedOvertimePolicyReview,
  saveTwoFixedOvertimePolicy,
} from '../data/two-fixed-overtime-repository';
import type { TwoFixedOvertimePolicyReview } from '../domain/two-fixed-overtime-store';
import type {
  TwoFixedOvertimeDecision,
  TwoFixedThresholdMode,
} from '../domain/two-fixed-overtime-policy';
import { formatMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/** Explicit source-bound POLICY review only; no actual overtime wage is generated. */
export function TwoFixedOvertimePolicyPanel({
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
  const [report, setReport] = useState<TwoFixedOvertimePolicyReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<TwoFixedOvertimeDecision | null>(null);
  const [threshold, setThreshold] = useState<TwoFixedThresholdMode | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReport(null);
      setError(null);
      setChoice(null);
      setThreshold(null);
      setReason('');
      void loadTwoFixedOvertimePolicyReview(periodKey, timeZone)
        .then((value) => {
          if (active) setReport(value);
        })
        .catch((failure: unknown) => {
          if (active)
            setError(failure instanceof Error ? failure.message : 'TWO_FIXED_OT_READ_FAILED');
        });
      return () => { active = false; };
    }, [periodKey, timeZone, refreshRevision, reload]),
  );

  async function save() {
    if (busy || report?.status !== 'review' || !choice ||
      (choice === 'include_logged_overtime' && !threshold)) return;
    try {
      if (reason.trim().length < 3 || reason.trim().length > 160)
        throw new Error('INVALID_TWO_FIXED_OT_REASON');
      setBusy(true);
      await saveTwoFixedOvertimePolicy({
        periodKey,
        startDay: report.startDay,
        scheduleTimeZone: timeZone,
        decision: choice,
        thresholdMode: choice === 'exclude_logged_overtime' ? null : threshold,
        expectedRevision: report.latestRevision,
        reason,
      });
      setReload((v) => v + 1);
      onSaved?.();
      Alert.alert(t('earnTwoFixedOtSaved'));
    } catch (failure) {
      Alert.alert(
        t('earnTwoFixedOtSaveFailed'),
        failure instanceof Error ? failure.message : 'TWO_FIXED_OT_SAVE_FAILED',
      );
    } finally {
      setBusy(false);
    }
  }

  if (report?.status === 'not_applicable') return null;

  function option(label: string, selected: boolean, action: () => void, disabled = false) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        disabled={disabled || busy}
        onPress={action}
        style={{
          borderWidth: 1,
          borderColor: selected ? c.accent : c.border,
          borderRadius: 12,
          padding: 12,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <Text style={{ color: c.text, fontWeight: selected ? '800' : '400' }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Panel>
      <Heading>{t('earnTwoFixedOtTitle')}</Heading>
      <Muted>{t('earnTwoFixedOtExplanation')}</Muted>
      {error ? (
        <Text style={{ color: c.danger }}>{error}</Text>
      ) : !report ? (
        <Muted>{t('loading')}</Muted>
      ) : report.status === 'requires_base' ? (
        <Muted>{t('earnTwoFixedOtRequiresBase')}</Muted>
      ) : report.status === 'blocked' ? (
        <>
          <Text style={{ color: c.danger, fontWeight: '700' }}>
            {t('earnTwoFixedOtBlocked')}
          </Text>
          {report.reasons.map((why) => <Muted key={why}>{why}</Muted>)}
        </>
      ) : (
        <>
          <Muted>{t('earnTwoFixedOtBaseSource', {
            base: formatMoneyMinor(report.baseTotalMinorUnits, report.currency, locale),
            revision: report.baseRevision,
          })}</Muted>
          {report.segments.map((segment, index) => (
            <View key={segment.profileId} style={{ gap: 4 }}>
              <Muted>{t('earnTwoFixedOtProfile', {
                index: index + 1,
                id: segment.profileId,
                revision: segment.profileRevision,
                minutes: segment.thresholdMinutes ?? t('earnTwoFixedOtUnconfigured'),
                rate: formatMoneyMinor(segment.overtimeHourlyMinorUnits, report.currency, locale),
                numerator: segment.multiplierNumerator,
                denominator: segment.multiplierDenominator,
              })}</Muted>
            </View>
          ))}
          {report.stale ? (
            <Text style={{ color: c.danger, fontWeight: '700' }}>
              {t('earnTwoFixedOtStale')}
            </Text>
          ) : report.latestDecision ? (
            <Muted>{t('earnTwoFixedOtCurrent', {
              decision: t(report.latestDecision === 'include_logged_overtime'
                ? 'earnTwoFixedOtInclude' : 'earnTwoFixedOtExclude'),
              mode: report.latestThresholdMode
                ? t(report.latestThresholdMode === 'carry_worked_time'
                  ? 'earnTwoFixedOtCarry' : 'earnTwoFixedOtReset')
                : t('earnTwoFixedOtNoMode'),
              revision: report.latestRevision,
            })}</Muted>
          ) : (
            <Muted>{t('earnTwoFixedOtMissing')}</Muted>
          )}
          <Muted>{t('earnTwoFixedOtDecisionLabel')}</Muted>
          {option(t('earnTwoFixedOtExclude'), choice === 'exclude_logged_overtime',
            () => { setChoice('exclude_logged_overtime'); setThreshold(null); })}
          {option(t('earnTwoFixedOtInclude'), choice === 'include_logged_overtime',
            () => setChoice('include_logged_overtime'), !report.canInclude)}
          {!report.canInclude ? <Muted>{t('earnTwoFixedOtNeedRates')}</Muted> : null}
          {choice === 'include_logged_overtime' ? (
            <>
              <Muted>{t('earnTwoFixedOtThresholdLabel')}</Muted>
              {option(t('earnTwoFixedOtCarry'), threshold === 'carry_worked_time',
                () => setThreshold('carry_worked_time'))}
              {option(t('earnTwoFixedOtReset'), threshold === 'restart_at_transition',
                () => setThreshold('restart_at_transition'))}
            </>
          ) : null}
          <Muted>{t('earnTwoFixedOtReason')}</Muted>
          <TextInput
            accessibilityLabel={t('earnTwoFixedOtReason')}
            value={reason}
            onChangeText={setReason}
            maxLength={160}
            placeholder={t('earnTwoFixedOtReasonPlaceholder')}
            placeholderTextColor={c.muted}
            style={{
              color: c.text, borderWidth: 1, borderColor: c.border,
              borderRadius: 12, padding: 12,
            }}
          />
          <Action
            label={t('earnTwoFixedOtSave')}
            disabled={busy || !choice || reason.trim().length < 3 ||
              (choice === 'include_logged_overtime' && (!threshold || !report.canInclude))}
            onPress={() => void save()}
          />
        </>
      )}
      <Muted>{t('earnTwoFixedOtNoPayYet')}</Muted>
    </Panel>
  );
}
