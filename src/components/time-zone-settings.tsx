import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { calendarDateInZone, resolveShift } from '../domain/shift-engine';
import { resolveShiftInterval } from '../domain/zoned-shift-time';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';
import {
  filterTimeZoneChoices,
  humanTimeZoneLabel,
  timeZoneChoices,
} from '../domain/time-zone-options';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * Explicit change to the schedule's IANA zone. The cycle's local civil dates
 * and clock hours stay unchanged; UTC interpretations change. Existing actual
 * sessions retain the immutable UTC instants and zone used when recorded.
 */
export function TimeZoneSettings() {
  const { t, i18n } = useTranslation();
  const c = usePalette();
  const { schedule, changeTimeZone } = useAppState();
  const [typed, setTyped] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const choices = useMemo(
    () => timeZoneChoices(schedule.timeZone, deviceTimeZone),
    [schedule.timeZone, deviceTimeZone],
  );
  const filtered = useMemo(
    () => filterTimeZoneChoices(choices, search, locale),
    [choices, search, locale],
  );
  if (!schedule.pattern) return null;

  const nextZone = (typed ?? schedule.timeZone).trim();
  const previewDate = schedule.pattern.anchorDate;
  const sample = resolveShift(previewDate, schedule);
  const currentSample =
    sample && !sample.template.isRestDay
      ? resolveShiftInterval(previewDate, sample.template, schedule.timeZone)
      : null;

  const confirmChange = () => {
    if (nextZone === schedule.timeZone) return;
    try {
      calendarDateInZone(nextZone);
      const changedSample =
        sample && !sample.template.isRestDay
          ? resolveShiftInterval(previewDate, sample.template, nextZone)
          : null;
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
              .then(() => {
                setTyped(null);
                Alert.alert(t('zoneSaved'));
              })
              .catch((e: unknown) =>
                Alert.alert(t('databaseError'), e instanceof Error ? e.message : ''),
              )
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
      <Muted>
        {t('deviceTimeZone')}: {humanTimeZoneLabel(deviceTimeZone, locale)}
      </Muted>
      <Action
        label={t('chooseTimeZone')}
        onPress={() => {
          setSearch('');
          setPickerOpen(true);
        }}
        disabled={saving}
      />
      <Text style={{ color: c.text, fontWeight: '700' }}>
        {humanTimeZoneLabel(nextZone, locale)}
      </Text>
      <Muted>{nextZone}</Muted>
      <Muted>{t('zoneChangeWarning')}</Muted>
      <View>
        <Action
          label={t('changeTimeZone')}
          onPress={confirmChange}
          disabled={saving || !nextZone || nextZone === schedule.timeZone}
        />
      </View>
      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView
          edges={['top', 'bottom', 'left', 'right']}
          style={{ flex: 1, backgroundColor: c.bg, padding: 16, gap: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Heading>{t('chooseTimeZone')}</Heading>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
              onPress={() => setPickerOpen(false)}
              style={{ padding: 12 }}
            >
              <Text style={{ color: c.accent, fontWeight: '700' }}>{t('cancel')}</Text>
            </Pressable>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            accessibilityLabel={t('timeZoneSearch')}
            placeholder={t('timeZoneSearch')}
            placeholderTextColor={c.muted}
            style={{
              color: c.text,
              backgroundColor: c.cardAlt,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
            }}
          />
          <FlatList
            data={filtered}
            keyExtractor={(zone) => zone}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Muted>{t('noTimeZones')}</Muted>}
            renderItem={({ item: zone }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: zone === nextZone }}
                accessibilityLabel={humanTimeZoneLabel(zone, locale)}
                onPress={() => {
                  setTyped(zone);
                  setPickerOpen(false);
                }}
                style={{
                  padding: 13,
                  marginBottom: 6,
                  backgroundColor: zone === nextZone ? c.cardAlt : c.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: zone === nextZone ? c.accent : c.border,
                }}
              >
                <Text style={{ color: c.text, fontWeight: '700' }}>
                  {humanTimeZoneLabel(zone, locale)}
                </Text>
                <Text style={{ color: c.muted }}>{zone}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </Panel>
  );
}
