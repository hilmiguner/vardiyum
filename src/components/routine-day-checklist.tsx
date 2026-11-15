import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadRoutineSnapshot,
  setRoutineCompletion,
  type RoutineSnapshot,
} from '../data/routine-repository';
import { tasksForDate } from '../domain/routine-engine';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';
import { Heading, Muted, Panel } from './ui';

export function RoutineDayChecklist({
  date,
  revision = 0,
  showHistory = false,
}: {
  date: string;
  revision?: number;
  showHistory?: boolean;
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const { schedule, loading: scheduleLoading } = useAppState();
  const [loaded, setLoaded] = useState<{ date: string; data: RoutineSnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await loadRoutineSnapshot(date);
    setLoaded({ date, data });
    setError(null);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRoutineSnapshot(date)
        .then((data) => {
          if (active) {
            setLoaded({ date, data });
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (active) setError(e instanceof Error ? e.message : 'DATABASE_ERROR');
        });
      return () => {
        active = false;
      };
    }, [date, revision]),
  );

  const change = async (id: string, checked: boolean) => {
    setBusy(id);
    try {
      await setRoutineCompletion(id, date, checked, schedule);
      await refresh();
    } catch (e) {
      Alert.alert(t('routineError'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(null);
    }
  };

  const data = loaded?.date === date ? loaded.data : null;
  const tasks = data ? tasksForDate(data.rules, date, schedule, data.completedIds) : [];
  const completed = tasks.filter((task) => task.completed).length;

  return (
    <Panel>
      <Heading>{t('dailyRoutineTitle', { date })}</Heading>
      {scheduleLoading ? (
        <Muted>{t('loading')}</Muted>
      ) : !schedule.pattern ? (
        <Muted>{t('noPattern')}</Muted>
      ) : error ? (
        <Text style={{ color: c.danger }}>
          {t('routineError')}: {error}
        </Text>
      ) : !data ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          <Muted>{t('routineProgress', { done: completed, total: tasks.length })}</Muted>
          {tasks.length === 0 ? (
            <Muted>{t('noTasksToday')}</Muted>
          ) : (
            tasks.map(({ rule, completed: checked }) => (
              <Pressable
                key={rule.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: busy !== null }}
                accessibilityLabel={rule.title}
                disabled={busy !== null}
                onPress={() => void change(rule.id, !checked)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderWidth: 2,
                    borderRadius: 7,
                    borderColor: c.accent,
                    backgroundColor: checked ? c.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: c.bg, fontWeight: '800' }}>{checked ? '✓' : ''}</Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: c.text,
                    fontSize: 16,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}
                >
                  {rule.title}
                </Text>
              </Pressable>
            ))
          )}
          {showHistory ? (
            <View style={{ gap: 8, marginTop: 12 }}>
              <Heading>{t('routineHistory')}</Heading>
              {data.events.length ? (
                data.events.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      gap: 2,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: c.text }}>
                      {event.titleSnapshot} ·{' '}
                      {t(event.action === 'completed' ? 'wasCompleted' : 'wasUndone')}
                    </Text>
                    <Muted>{event.occurredAt}</Muted>
                  </View>
                ))
              ) : (
                <Muted>{t('noRoutineHistory')}</Muted>
              )}
              <Muted>{t('historyIsPreserved')}</Muted>
            </View>
          ) : null}
        </>
      )}
    </Panel>
  );
}
