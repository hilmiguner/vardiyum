import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../components/ui';
import { TimeZoneSettings } from '../components/time-zone-settings';
import { EncryptedBackupPanel } from '../components/encrypted-backup-panel';
import { PayPeriodSettingsPanel } from '../components/pay-period-settings-panel';
import {
  DEFAULT_TEMPLATES,
  localDateString,
  type ShiftTemplate,
  validateScheduleConfig,
} from '../domain/shift-engine';
import { useAppState } from '../state/app-state';
import { assertRemovableShiftTemplate } from '../domain/shift-template-deletion';
import { usePalette } from '../theme/colors';

interface TemplateDraft {
  id: string;
  name: string;
  color: string;
  startsAt: string;
  endsAt: string;
  breakText: string;
  isRestDay: boolean;
}
interface Draft {
  anchor: string;
  days: string[];
  templates: TemplateDraft[];
  removedIds: string[];
}
const COLORS = ['#56A3FF', '#E8A86E', '#A18CF6', '#5EC59C', '#F4A4B4'];

function toDraft(template: ShiftTemplate): TemplateDraft {
  return {
    id: template.id,
    name: template.name,
    color: template.color,
    startsAt: template.startsAt ?? '',
    endsAt: template.endsAt ?? '',
    breakText: String(template.breakMinutes),
    isRestDay: template.isRestDay,
  };
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = usePalette();
  const { schedule, saveConfig, reload, loading, error } = useAppState();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = (): Draft => ({
    anchor: schedule.pattern?.anchorDate ?? localDateString(),
    days: [...(schedule.pattern?.days ?? ['morning'])],
    templates: (schedule.templates.length ? schedule.templates : DEFAULT_TEMPLATES).map(
      toDraft,
    ),
    removedIds: [],
  });
  const view = draft ?? initial();
  const edit = (transform: (current: Draft) => Draft) =>
    setDraft((before) => transform(before ?? initial()));

  const cycleDay = (index: number) =>
    edit((before) => {
      const updated = [...before.days];
      const ids = before.templates.map((template) => template.id);
      updated[index] = ids[(ids.indexOf(updated[index]) + 1) % ids.length];
      return { ...before, days: updated };
    });

  const changeTemplate = (id: string, patch: Partial<TemplateDraft>) => {
    edit((before) => ({
      ...before,
      templates: before.templates.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const addTemplate = (isRestDay: boolean) => {
    edit((before) => {
      if (before.templates.length >= 100) return before;
      const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        ...before,
        templates: [
          ...before.templates,
          {
            id,
            name: isRestDay ? t('restName') : t('customName'),
            color: COLORS[before.templates.length % COLORS.length],
            startsAt: isRestDay ? '' : '08:00',
            endsAt: isRestDay ? '' : '16:00',
            breakText: '0',
            isRestDay,
          },
        ],
      };
    });
  };

  const removeTemplate = (entry: TemplateDraft) => {
    try {
      assertRemovableShiftTemplate(entry.id, view.templates, view.days, schedule.overrides);
    } catch {
      Alert.alert(t('deleteShiftTypeTitle'), t('deleteShiftTypeInUse'));
      return;
    }
    Alert.alert(t('deleteShiftTypeTitle'), t('deleteShiftTypeConfirm', { name: entry.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () =>
          edit((before) => ({
            ...before,
            templates: before.templates.filter((item) => item.id !== entry.id),
            removedIds:
              schedule.templates.some((item) => item.id === entry.id) &&
              !before.removedIds.includes(entry.id)
                ? [...before.removedIds, entry.id]
                : before.removedIds,
          })),
      },
    ]);
  };

  const save = async () => {
    if (loading || error) return;
    let valid;
    try {
      const templates: ShiftTemplate[] = view.templates.map((item) => {
        if (!/^\d+$/.test(item.breakText)) throw new Error('INVALID_BREAK_MINUTES');
        const startsAt = item.isRestDay ? null : item.startsAt.trim();
        const endsAt = item.isRestDay ? null : item.endsAt.trim();
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          startsAt,
          endsAt,
          isRestDay: item.isRestDay,
          endDayOffset: !item.isRestDay && startsAt && endsAt && endsAt <= startsAt ? 1 : 0,
          breakMinutes: Number(item.breakText),
        };
      });
      valid = validateScheduleConfig({ anchorDate: view.anchor, days: view.days }, templates);
    } catch (reason) {
      Alert.alert(t('invalidSchedule'), reason instanceof Error ? reason.message : '');
      return;
    }
    setSaving(true);
    try {
      await saveConfig(valid.pattern, valid.templates, view.removedIds);
      Alert.alert(t('saved'));
      router.back();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '';
      Alert.alert(
        t('databaseError'),
        message.includes('SHIFT_TEMPLATE_IN_USE') || message.includes('SHIFT_USED_BY_ROUTINE')
          ? t('deleteShiftTypeReferenced')
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title={t('settings')} settings={false} subtitle={t('setupSubtitle')}>
      {loading ? (
        <Muted>{t('loading')}</Muted>
      ) : error ? (
        <Panel>
          <Heading>{t('databaseError')}</Heading>
          <Muted>{error}</Muted>
          <Action label={t('retry')} onPress={() => void reload()} />
        </Panel>
      ) : (
        <>
          <Panel>
            <Heading>{t('anchorDate')}</Heading>
            <TextInput
              value={view.anchor}
              onChangeText={(anchor) => edit((before) => ({ ...before, anchor }))}
              maxLength={10}
              autoCapitalize="none"
              accessibilityLabel={t('anchorDate')}
              placeholder="2026-11-15"
              placeholderTextColor={c.muted}
              style={{
                color: c.text,
                fontSize: 17,
                backgroundColor: c.cardAlt,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <Muted>{t('scheduleZone', { zone: schedule.timeZone })}</Muted>
            <Heading>
              {t('cycle')} ({view.days.length})
            </Heading>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {view.days.map((id, index) => {
                const template = view.templates.find((item) => item.id === id);
                return (
                  <Pressable
                    key={index}
                    onPress={() => cycleDay(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}. ${t('day')}: ${template?.name ?? id}`}
                    style={{
                      backgroundColor: c.cardAlt,
                      borderRadius: 14,
                      padding: 12,
                      borderBottomWidth: 3,
                      borderBottomColor: template?.color ?? c.accent,
                    }}
                  >
                    <Text style={{ color: c.muted, fontSize: 11 }}>
                      {index + 1}. {t('day')}
                    </Text>
                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>
                      {template?.name ?? id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('addDay')}
                onPress={() =>
                  edit((before) => ({
                    ...before,
                    days: [
                      ...before.days,
                      before.templates.find((item) => item.isRestDay)?.id ??
                        before.templates[0].id,
                    ],
                  }))
                }
                disabled={view.days.length >= 366}
                style={{ backgroundColor: c.cardAlt, padding: 12, borderRadius: 10, flex: 1 }}
              >
                <Text style={{ color: c.text, textAlign: 'center' }}>+ {t('addDay')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('removeDay')}
                onPress={() =>
                  edit((before) => ({ ...before, days: before.days.slice(0, -1) }))
                }
                disabled={view.days.length <= 1}
                style={{ backgroundColor: c.cardAlt, padding: 12, borderRadius: 10, flex: 1 }}
              >
                <Text style={{ color: c.text, textAlign: 'center' }}>− {t('removeDay')}</Text>
              </Pressable>
            </View>
          </Panel>

          <Panel>
            <Heading>{t('shiftTypes')}</Heading>
            <Muted>{t('shiftTypesHint')}</Muted>
            {view.templates.map((template) => (
              <View
                key={template.id}
                style={{
                  backgroundColor: c.cardAlt,
                  borderRadius: 14,
                  padding: 14,
                  gap: 9,
                  borderLeftWidth: 4,
                  borderLeftColor: template.color,
                }}
              >
                <TextInput
                  accessibilityLabel={t('shiftName')}
                  value={template.name}
                  onChangeText={(name) => changeTemplate(template.id, { name })}
                  placeholder={t('shiftName')}
                  placeholderTextColor={c.muted}
                  maxLength={40}
                  style={{ color: c.text, fontSize: 17, fontWeight: '700' }}
                />
                {!template.isRestDay && (
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    {(
                      [
                        ['startsAt', t('startTime')],
                        ['endsAt', t('endTime')],
                        ['breakText', t('breakMinutes')],
                      ] as const
                    ).map(([field, label]) => (
                      <View key={field} style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
                        <TextInput
                          accessibilityLabel={label}
                          value={template[field]}
                          autoCorrect={false}
                          placeholderTextColor={c.muted}
                          onChangeText={(value) =>
                            changeTemplate(template.id, { [field]: value })
                          }
                          maxLength={field === 'breakText' ? 4 : 5}
                          style={{
                            color: c.text,
                            padding: 9,
                            borderWidth: 1,
                            borderColor: c.border,
                            borderRadius: 9,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                )}
                {template.isRestDay ? <Muted>{t('restDay')}</Muted> : null}
                {view.templates.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('deleteShiftType')}: ${template.name}`}
                    onPress={() => removeTemplate(template)}
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: '700' }}>
                      {t('deleteShiftType')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Action
                  label={t('addShift')}
                  onPress={() => addTemplate(false)}
                  disabled={view.templates.length >= 100}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={t('addRest')}
                  onPress={() => addTemplate(true)}
                  disabled={view.templates.length >= 100}
                />
              </View>
            </View>
            <Muted>{t('overnightHint')}</Muted>
          </Panel>
          <Action label={t('save')} onPress={() => void save()} disabled={saving} />
          <TimeZoneSettings />
        </>
      )}
      <PayPeriodSettingsPanel timeZone={schedule.timeZone} />
      <EncryptedBackupPanel />
    </Page>
  );
}
