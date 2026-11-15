import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../../components/ui';
import { ScheduledDuration } from '../../components/scheduled-duration';
import {
  addCalendarDays,
  calendarDateInZone,
  resolveShift,
  type ResolvedShift,
} from '../../domain/shift-engine';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

function timeLabel(shift: ResolvedShift): string {
  if (shift.template.isRestDay) return '—';
  const { startsAt, endsAt, endDayOffset } = shift.template;
  return `${startsAt} – ${endsAt}${endDayOffset === 1 ? ' (+1)' : ''}`;
}

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = usePalette();
  const { schedule, loading, error, reload } = useAppState();
  const today = calendarDateInZone(schedule.timeZone);
  const current = resolveShift(today, schedule);
  const nextDate = addCalendarDays(today, 1);
  const next = resolveShift(nextDate, schedule);

  return (
    <Page title="Vardiyum" subtitle={t('greeting')}>
      {loading ? (
        <Muted>{t('loading')}</Muted>
      ) : error ? (
        <Panel>
          <Muted>
            {t('databaseError')} ({error})
          </Muted>
          <Action label={t('retry')} onPress={() => void reload()} />
        </Panel>
      ) : !current ? (
        <Panel>
          <Heading>{t('configure')}</Heading>
          <Muted>{t('configureDescription')}</Muted>
          <Action label={t('configure')} onPress={() => router.push('/settings')} />
        </Panel>
      ) : (
        <>
          <Panel>
            <Muted>
              {t('shiftToday')} · {today}
            </Muted>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 9,
                  height: 55,
                  borderRadius: 10,
                  backgroundColor: current.template.color,
                }}
              />
              <View>
                <Text style={{ color: c.text, fontSize: 30, fontWeight: '800' }}>
                  {current.template.name}
                </Text>
                <Text style={{ color: c.muted, fontSize: 15 }}>{timeLabel(current)}</Text>
              </View>
            </View>
            <ScheduledDuration
              date={today}
              template={current.template}
              timeZone={schedule.timeZone}
            />
            {current.source === 'override' && <Muted>{t('editedDay')}</Muted>}
          </Panel>
          <Panel>
            <Heading>{t('nextShift')}</Heading>
            <Text style={{ color: c.text, fontSize: 18 }}>
              {nextDate} · {next?.template.name ?? '—'}
            </Text>
            {next && <Muted>{timeLabel(next)}</Muted>}
          </Panel>
        </>
      )}
      <Muted>{t('offline')}</Muted>
    </Page>
  );
}
