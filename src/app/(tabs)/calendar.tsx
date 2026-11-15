import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Heading, Muted, Page, Panel } from '../../components/ui';
import { addCalendarDays, localDateString, scheduledShift } from '../../domain/shift-engine';
import { SHIFT_PRESENTATION } from '../../domain/shift-engine.types';
import { useAppState } from '../../state/app-state';
import { usePalette } from '../../theme/colors';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { pattern, loading } = useAppState();
  const c = usePalette();
  const today = localDateString();
  return (
    <Page title={t('calendar')} subtitle={t('upcoming')}>
      {loading ? <Muted>{t('loading')}</Muted> : !pattern ? (
        <Panel><Muted>{t('noPattern')}</Muted></Panel>
      ) : (
        <Panel>
          <Heading>{t('upcoming')}</Heading>
          {Array.from({ length: 14 }, (_, offset) => {
            const date = addCalendarDays(today, offset);
            const code = scheduledShift(date, pattern);
            const info = SHIFT_PRESENTATION[code];
            return (
              <View key={date} style={{ flexDirection: 'row', alignItems: 'center',
                borderTopWidth: offset === 0 ? 0 : 1, borderColor: c.border, paddingVertical: 9 }}>
                <View style={{ width: 5, height: 32, borderRadius: 4,
                  backgroundColor: info.color, marginRight: 13 }} />
                <Text style={{ flex: 1, color: c.text, fontWeight: offset === 0 ? '800' : '500' }}>
                  {date}
                </Text>
                <Text style={{ color: c.muted }}>{t(code)}</Text>
              </View>
            );
          })}
        </Panel>
      )}
    </Page>
  );
}
