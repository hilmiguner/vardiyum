import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { calendarDateInZone, resolveShift } from '../domain/shift-engine';
import { resolveShiftInterval } from '../domain/zoned-shift-time';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * Explicit change to the schedule's IANA zone. The cycle's local civil dates
 * and clock hours stay unchanged; UTC interpretations change. Existing actual
 * sessions retain the immutable UTC instants and zone used when recorded.
 */
export function TimeZoneSettings() {
  const { t } = useTranslation();
  const c = usePalette();
  const { schedule, changeTimeZone } = useAppState();
  const [typed, setTyped] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!schedule.pattern) return null;

  const nextZone = (typed ?? schedule.timeZone).trim();
  const previewDate = schedule.pattern.anchorDate;
  const sample = resolveShift(previewDate, schedule);
  const currentSample = sample && !sample.template.isRestDay
    ? resolveShiftInterval(previewDate, sample.template, schedule.timeZone) : null;

  const confirmChange = () => {
    if (nextZone === schedule.timeZone) return;
    try {
      calendarDateInZone(nextZone);
      const changedSample = sample && !sample.template.isRestDay
        ? resolveShiftInterval(previewDate, sample.template, nextZone) : null;
      const description = [
        t('fromZoneToZone', { from: schedule.timeZone, to: nextZone }),
        t('timeZoneCyclePreserved'),
        t('zonePreviewDate', { date: previewDate }),
        t('zonePreviewFromUtc', {
          start: currentSample?.status === 'resolved' ? currentSample.startInstantUtc : '—',
        }),
        t('zonePreviewToUtc', {
          start: changedSample?.status === 'resolved' ? changedSample.startInstantUtc : '—',
        }),
        t('zoneActualRecordsUnchanged'),
      ].join('\n');
      Alert.alert(t('confirmTimeZone'), description, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: () => {
            setSaving(true);
            void changeTimeZone(nextZone)
              .then(() => { setTyped(null); Alert.alert(t('zoneSaved')); })
              .catch((e: unknown) => Alert.alert(t('databaseError'),
                e instanceof Error ? e.message : ''))
              .finally(() => setSaving(false));
          },
        },
      ]);
    } catch {
      Alert.alert(t('invalidTimeZone'));
    }
  };

  return (
    <Panel>
      <Heading>{t('scheduleTimeZoneTitle')}</Heading>
      <Muted>{t('currentTimeZone', { zone: schedule.timeZone })}</Muted>
      <Text style={{ color: c.muted }}>{t('timeZoneIdentifier')}</Text>
      <TextInput value={typed ?? schedule.timeZone} autoCapitalize="none"
        autoCorrect={false} onChangeText={setTyped} accessibilityLabel={t('timeZoneIdentifier')}
        placeholder="Europe/Istanbul" placeholderTextColor={c.muted}
        style={{ color: c.text, borderWidth: 1, borderColor: c.border,
          padding: 12, borderRadius: 12 }} />
      <Muted>{t('zoneChangeWarning')}</Muted>
      <View>
        <Action label={t('changeTimeZone')} onPress={confirmChange}
          disabled={saving || !nextZone || nextZone === schedule.timeZone} />
      </View>
    </Panel>
  );
}
