import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { loadPayPeriodStartDay, savePayPeriodStartDay } from '../data/pay-period-repository';
import { customPayPeriodBounds, payPeriodForDate } from '../domain/pay-period';
import { validatePayPeriodStartDay } from '../domain/pay-period-settings';
import { calendarDateInZone } from '../domain/shift-engine';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

const DAY = /^(?:[1-9]|1[0-9]|2[0-8])$/;

/**
 * Preparation-only setting. The real earnings report is intentionally still
 * calendar-month based until mixed effective rates and break audit are ready.
 */
export function PayPeriodSettingsPanel({ timeZone }: { timeZone: string }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [draft, setDraft] = useState('1');
  const [storedDay, setStoredDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      void loadPayPeriodStartDay()
        .then((day) => {
          if (!active) return;
          setStoredDay(day);
          setDraft(String(day));
        })
        .catch((reason: unknown) => {
          if (!active) return;
          setStoredDay(null);
          setError(reason instanceof Error ? reason.message : 'PAY_PERIOD_SETTING_READ_FAILED');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const parsed = DAY.test(draft) ? Number(draft) : null;
  let preview = '';
  let previewError = false;
  if (parsed !== null) {
    try {
      const localDate = calendarDateInZone(timeZone, new Date());
      const key = payPeriodForDate(localDate, parsed);
      const bounds = customPayPeriodBounds(key, parsed);
      preview = t('payPeriodPreviewDates', {
        start: bounds.startDate,
        end: bounds.endDateInclusive,
        zone: timeZone,
      });
    } catch {
      previewError = true;
    }
  }

  const save = async () => {
    if (loading || saving || error || parsed === null) return;
    try {
      const valid = validatePayPeriodStartDay(parsed);
      setSaving(true);
      await savePayPeriodStartDay(valid);
      setStoredDay(valid);
      Alert.alert(t('payPeriodPreferenceSaved'));
    } catch (reason) {
      Alert.alert(
        t('payPeriodPreferenceError'),
        reason instanceof Error ? reason.message : 'PAY_PERIOD_SETTING_WRITE_FAILED',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <Heading>{t('payPeriodPreferenceTitle')}</Heading>
      <Muted>{t('payPeriodPreferenceExplanation')}</Muted>
      {loading ? (
        <Muted>{t('loading')}</Muted>
      ) : error ? (
        <Muted>{t('payPeriodPreferenceError') + ': ' + error}</Muted>
      ) : (
        <>
          <Muted>{t('payPeriodPreferenceStartDay')}</Muted>
          <TextInput
            accessibilityLabel={t('payPeriodPreferenceStartDay')}
            keyboardType="number-pad"
            value={draft}
            onChangeText={setDraft}
            placeholder="26"
            placeholderTextColor={palette.muted}
            maxLength={2}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 10,
              padding: 12,
              color: palette.text,
              fontSize: 16,
            }}
          />
          <Muted>{t('payPeriodPreferenceHint')}</Muted>
          {parsed === null ? (
            <Muted>{t('payPeriodPreferenceInvalid')}</Muted>
          ) : previewError ? (
            <Muted>{t('payPeriodPreviewUnavailable')}</Muted>
          ) : (
            <Muted>{preview}</Muted>
          )}
          <Action
            label={t('payPeriodPreferenceSave')}
            onPress={() => void save()}
            disabled={saving || parsed === null || previewError || parsed === storedDay}
          />
          <View>
            <Muted>{t('payPeriodPreferenceNotEnabled')}</Muted>
          </View>
        </>
      )}
    </Panel>
  );
}
