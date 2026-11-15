import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../../components/ui';
import { RoutineDayChecklist } from '../../components/routine-day-checklist';
import { ReminderConsentPanel } from '../../components/reminder-consent-panel';
import {
  archiveRoutine,
  createRoutine,
  loadRoutineSnapshot,
  restoreRoutine,
  updateRoutine,
} from '../../data/routine-repository';
import { calendarDateInZone, calendarOrdinal } from '../../domain/shift-engine';
import {
  EVERY_DAY,
  validateRoutine,
  type RoutineRule,
  type RoutineRecurrence,
} from '../../domain/routine-engine';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function RoutineEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: RoutineRule;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const { schedule } = useAppState();
  const recurrence = initial?.recurrence ?? EVERY_DAY;
  const [reminderText, setReminderText] = useState(initial?.reminderClock ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [shiftIds, setShiftIds] = useState<string[]>([...recurrence.shiftIds]);
  const [weekdays, setWeekdays] = useState<number[]>([...recurrence.weekdays]);
  const [restOnly, setRestOnly] = useState(recurrence.restOnly);
  const [cycleText, setCycleText] = useState(recurrence.cycleDays.map((x) => x + 1).join(','));
  const [saving, setSaving] = useState(false);

  const toggle = <T extends string | number>(items: readonly T[], item: T): T[] =>
    items.includes(item) ? items.filter((x) => x !== item) : [...items, item];

  const save = async () => {
    try {
      const patternLength = schedule.pattern?.days.length ?? 0;
      const positions = cycleText.trim()
        ? cycleText
            .trim()
            .split(/[ ,;]+/)
            .map((s) => {
              if (!/^\d+$/.test(s)) throw new Error('INVALID_CYCLE_FILTER');
              const n = Number(s);
              if (!Number.isSafeInteger(n) || n < 1 || n > patternLength)
                throw new Error('INVALID_CYCLE_FILTER');
              return n - 1;
            })
        : [];
      const rule: RoutineRule = validateRoutine({
        id:
          initial?.id ??
          `routine_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`,
        title,
        recurrence: {
          version: 1,
          shiftIds,
          weekdays,
          cycleDays: positions,
          restOnly,
        } satisfies RoutineRecurrence,
        enabled,
        archivedAt: null,
        revision: initial?.revision ?? 1,
        reminderClock: reminderText.trim() || null,
        reminderTimeZone: reminderText.trim() ? schedule.timeZone : null,
      });
      setSaving(true);
      if (initial) await updateRoutine(rule);
      else await createRoutine(rule);
      onSaved();
    } catch (error) {
      Alert.alert(t('routineInvalid'), error instanceof Error ? error.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <Heading>{t(initial ? 'editRoutine' : 'newRoutine')}</Heading>
      <Muted>{t('routineRuleSemantics')}</Muted>
      <TextInput
        accessibilityLabel={t('routineTitle')}
        placeholder={t('routineTitle')}
        placeholderTextColor={c.muted}
        value={title}
        maxLength={80}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          color: c.text,
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
        }}
      />
      <Heading>{t('routineShiftFilter')}</Heading>
      <Muted>{t('routineEmptyAny')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {schedule.templates.map((shift) => {
          const selected = shiftIds.includes(shift.id);
          return (
            <Pressable
              key={shift.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={shift.name}
              onPress={() => setShiftIds((before) => toggle(before, shift.id))}
              style={{
                padding: 10,
                borderWidth: 2,
                borderRadius: 10,
                borderColor: selected ? c.accent : c.border,
              }}
            >
              <Text style={{ color: c.text }}>{shift.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Heading>{t('routineWeekdayFilter')}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {WEEKDAYS.map((key, index) => {
          const day = index + 1;
          const selected = weekdays.includes(day);
          return (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t(key)}
              onPress={() => setWeekdays((before) => toggle(before, day))}
              style={{
                padding: 10,
                borderWidth: 2,
                borderRadius: 10,
                borderColor: selected ? c.accent : c.border,
              }}
            >
              <Text style={{ color: c.text }}>{t(key)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Heading>{t('reminderTimeTitle')}</Heading>
      <Muted>{t('reminderTimeHint', { timeZone: schedule.timeZone })}</Muted>
      <TextInput
        accessibilityLabel={t('reminderTimeTitle')}
        value={reminderText}
        onChangeText={setReminderText}
        maxLength={5}
        placeholder="08:30"
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={c.muted}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          color: c.text,
          borderRadius: 12,
          padding: 12,
        }}
      />
      <Heading>{t('routineCycleFilter')}</Heading>
      <Muted>{t('routineCycleHint', { length: schedule.pattern?.days.length ?? 0 })}</Muted>
      <TextInput
        accessibilityLabel={t('routineCycleFilter')}
        value={cycleText}
        onChangeText={setCycleText}
        placeholder={t('routineCycleExample')}
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          color: c.text,
          borderRadius: 12,
          padding: 12,
        }}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: restOnly }}
        accessibilityLabel={t('routineRestOnly')}
        onPress={() => setRestOnly(!restOnly)}
        style={{
          padding: 10,
          borderWidth: 1,
          borderColor: restOnly ? c.accent : c.border,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: c.text }}>
          {restOnly ? '☑' : '☐'} {t('routineRestOnly')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel={t('routineEnabled')}
        onPress={() => setEnabled(!enabled)}
        style={{
          padding: 10,
          borderWidth: 1,
          borderColor: enabled ? c.accent : c.border,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: c.text }}>
          {enabled ? '☑' : '☐'} {t('routineEnabled')}
        </Text>
      </Pressable>
      <Action label={t('saveRoutine')} disabled={saving} onPress={() => void save()} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cancel')}
        onPress={onCancel}
        style={{ padding: 10, alignItems: 'center' }}
      >
        <Text style={{ color: c.text }}>{t('cancel')}</Text>
      </Pressable>
    </Panel>
  );
}

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const c = usePalette();
  const { schedule, loading: scheduleLoading, refreshReminders } = useAppState();
  const today = calendarDateInZone(schedule.timeZone);
  const [dateInput, setDateInput] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [rules, setRules] = useState<RoutineRule[]>([]);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await loadRoutineSnapshot(selectedDate);
    setRules(next.rules);
    setRevision((n) => n + 1);
    setLoadError(null);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRoutineSnapshot(selectedDate)
        .then((snapshot) => {
          if (active) {
            setRules(snapshot.rules);
            setLoadError(null);
          }
        })
        .catch((e: unknown) => {
          if (active) setLoadError(e instanceof Error ? e.message : 'DATABASE_ERROR');
        });
      return () => {
        active = false;
      };
    }, [selectedDate]),
  );

  const perform = async (action: () => Promise<void>) => {
    try {
      await action();
      refreshReminders();
      await refresh();
    } catch (error) {
      Alert.alert(t('routineError'), error instanceof Error ? error.message : '');
    }
  };

  const confirmArchive = (rule: RoutineRule) => {
    Alert.alert(t('archiveRoutine'), t('routineArchiveWarning'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('archiveRoutine'),
        style: 'destructive',
        onPress: () => void perform(() => archiveRoutine(rule.id)),
      },
    ]);
  };

  const setDate = () => {
    try {
      calendarOrdinal(dateInput);
      setSelectedDate(dateInput);
    } catch {
      Alert.alert(t('invalidDate'));
    }
  };
  return (
    <Page title={t('routines')} subtitle={t('routinePageSubtitle')}>
      {scheduleLoading ? (
        <Muted>{t('loading')}</Muted>
      ) : !schedule.pattern ? (
        <Panel>
          <Muted>{t('noPattern')}</Muted>
        </Panel>
      ) : (
        <>
          <Panel>
            <Heading>{t('viewRoutineDate')}</Heading>
            <TextInput
              accessibilityLabel={t('viewRoutineDate')}
              value={dateInput}
              onChangeText={setDateInput}
              maxLength={10}
              placeholder="2026-11-15"
              placeholderTextColor={c.muted}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                padding: 12,
                color: c.text,
              }}
            />
            <Action label={t('showDate')} onPress={setDate} />
          </Panel>
          <ReminderConsentPanel />
          <RoutineDayChecklist date={selectedDate} revision={revision} showHistory />
          {loadError ? <Text style={{ color: c.danger }}>{loadError}</Text> : null}
          <Panel>
            <Heading>{t('manageRoutineRules')}</Heading>
            {rules.filter((rule) => rule.archivedAt === null).length === 0 ? (
              <Muted>{t('noRoutineRules')}</Muted>
            ) : null}
            {rules
              .filter((rule) => rule.archivedAt === null)
              .map((rule) => (
                <View
                  key={rule.id}
                  style={{
                    gap: 8,
                    borderTopWidth: 1,
                    borderColor: c.border,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ color: c.text, fontWeight: '700' }}>{rule.title}</Text>
                  <Muted>{t(rule.enabled ? 'routineActive' : 'routineDisabled')}</Muted>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('editRoutine')}
                      onPress={() => setEditing(rule.id)}
                    >
                      <Text style={{ color: c.accent }}>{t('editRoutine')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('toggleRoutine')}
                      onPress={() =>
                        void perform(() =>
                          updateRoutine({
                            ...rule,
                            enabled: !rule.enabled,
                          }),
                        )
                      }
                    >
                      <Text style={{ color: c.accent }}>{t('toggleRoutine')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('archiveRoutine')}
                      onPress={() => confirmArchive(rule)}
                    >
                      <Text style={{ color: c.danger }}>{t('archiveRoutine')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            <Action label={t('addRoutine')} onPress={() => setEditing('new')} />
          </Panel>
          {editing !== null ? (
            <RoutineEditor
              key={editing}
              initial={rules.find((rule) => rule.id === editing)}
              onSaved={() => {
                setEditing(null);
                refreshReminders();
                void refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : null}
          {rules.some((rule) => rule.archivedAt !== null) ? (
            <Panel>
              <Heading>{t('archivedRoutines')}</Heading>
              <Muted>{t('historyIsPreserved')}</Muted>
              {rules
                .filter((rule) => rule.archivedAt !== null)
                .map((rule) => (
                  <View key={rule.id} style={{ gap: 5 }}>
                    <Muted>{rule.title}</Muted>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('restoreRoutine')}
                      onPress={() => void perform(() => restoreRoutine(rule.id))}
                    >
                      <Text style={{ color: c.accent }}>{t('restoreRoutine')}</Text>
                    </Pressable>
                  </View>
                ))}
            </Panel>
          ) : null}
        </>
      )}
    </Page>
  );
}
