import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../../components/ui';
import { addCalendarDays, localDateString, scheduledShift } from '../../domain/shift-engine';
import { SHIFT_PRESENTATION } from '../../domain/shift-engine.types';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = usePalette();
  const { pattern, loading, error, reload } = useAppState();
  const today = localDateString();
  const current = pattern ? scheduledShift(today, pattern) : null;
  const next = pattern ? scheduledShift(addCalendarDays(today, 1), pattern) : null;

  return (
    <Page title="Vardiyum" subtitle={t('greeting')}>
      {loading ? <Muted>{t('loading')}</Muted> : error ? (
        <Panel><Muted>{t('databaseError')} ({error})</Muted>
          <Action label={t('retry')} onPress={() => void reload()} /></Panel>
      ) : !pattern ? (
        <Panel>
          <Heading>{t('configure')}</Heading>
          <Muted>{t('configureDescription')}</Muted>
          <Action label={t('configure')} onPress={() => router.push('/settings')} />
        </Panel>
      ) : (
        <>
          <Panel>
            <Muted>{t('shiftToday')} · {today}</Muted>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 9, height: 55, borderRadius: 10,
                backgroundColor: SHIFT_PRESENTATION[current!].color }} />
              <View>
                <Text style={{ color: c.text, fontSize: 30, fontWeight: '800' }}>{t(current!)}</Text>
                <Text style={{ color: c.muted, fontSize: 15 }}>
                  {SHIFT_PRESENTATION[current!].startsAt ?? '—'} – {SHIFT_PRESENTATION[current!].endsAt ?? '—'}
                </Text>
              </View>
            </View>
          </Panel>
          <Panel>
            <Heading>{t('nextShift')}</Heading>
            <Text style={{ color: c.text, fontSize: 18 }}>
              {addCalendarDays(today, 1)} · {t(next!)}
            </Text>
          </Panel>
        </>
      )}
      <Muted>{t('offline')}</Muted>
    </Page>
  );
}
