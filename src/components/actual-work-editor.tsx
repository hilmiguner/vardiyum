import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { addCalendarDays, type ShiftTemplate } from '../domain/shift-engine';
import { prepareActualWork, type ActualWorkSession } from '../domain/work-records';
import { possibleUtcInstants, type FoldChoice } from '../domain/zoned-shift-time';
import { loadActualWork, removeActualWork, storeActualWork } from '../data/work-repository';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

interface Props {
  date: string;
  template: ShiftTemplate;
  timeZone: string;
}

const CHOICES: readonly FoldChoice[] = ['reject', 'earlier', 'later'];

export function ActualWorkEditor({ date, template, timeZone }: Props) {
  const { t } = useTranslation();
  const c = usePalette();
  const [startClock, setStartClock] = useState(template.startsAt ?? '08:00');
  const [endDate, setEndDate] = useState(addCalendarDays(date, template.endDayOffset));
  const [endClock, setEndClock] = useState(template.endsAt ?? '16:00');
  const [breakText, setBreakText] = useState(String(template.breakMinutes));
  const [note, setNote] = useState('');
  const [startChoice, setStartChoice] = useState<FoldChoice>('reject');
  const [endChoice, setEndChoice] = useState<FoldChoice>('reject');
  const [sessions, setSessions] = useState<ActualWorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadActualWork(date)
      .then((value) => {
        if (alive) setSessions(value);
      })
      .catch((error: unknown) => {
        if (alive) Alert.alert(t('databaseError'), error instanceof Error ? error.message : '');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [date, t]);

  const renderClockChoice = (
    label: string,
    localDate: string,
    clock: string,
    value: FoldChoice,
    onChange: (next: FoldChoice) => void,
  ) => {
    let instants: readonly string[] = [];
    try {
      instants = possibleUtcInstants(localDate, clock, timeZone);
    } catch {
      return null;
    }
    if (instants.length <= 1) return null;
    return (
      <View style={{ gap: 6 }}>
        <Muted>{t('actualRepeatedTime', { boundary: label })}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CHOICES.map((choice) => (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityState={{ selected: value === choice }}
              accessibilityLabel={t('boundaryChoiceAccessible', {
                boundary: label,
                choice: t('foldChoice_' + choice),
              })}
              onPress={() => onChange(choice)}
              style={{
                borderWidth: 2,
                borderColor: value === choice ? c.accent : c.border,
                padding: 9,
                borderRadius: 9,
              }}
            >
              <Text style={{ color: c.text }}>{t('foldChoice_' + choice)}</Text>
            </Pressable>
          ))}
        </View>
        <Muted>{instants.join(' / ')}</Muted>
      </View>
    );
  };

  const save = async () => {
    if (!/^\d+$/.test(breakText)) {
      Alert.alert(t('invalidActualEntry'), t('actualBreakInvalid'));
      return;
    }
    try {
      const draft = {
        localDate: date,
        startClock,
        endDate,
        endClock,
        timeZone,
        startChoice,
        endChoice,
        breakMinutes: Number(breakText),
        note,
      };
      const result = prepareActualWork(draft);
      if (result.status !== 'valid') {
        Alert.alert(t('invalidActualEntry'), t('actualError_' + result.reason));
        return;
      }
      setSaving(true);
      await storeActualWork(draft);
      setSessions(await loadActualWork(date));
      setNote('');
      Alert.alert(t('actualEntrySaved'));
    } catch (reason) {
      Alert.alert(t('invalidActualEntry'), reason instanceof Error ? reason.message : '');
    } finally {
      setSaving(false);
    }
  };
  const remove = (id: string) => {
    Alert.alert(t('confirmDeleteActual'), t('actualDeleteWarning'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void removeActualWork(id)
            .then(async () => setSessions(await loadActualWork(date)))
            .catch((e: unknown) =>
              Alert.alert(t('databaseError'), e instanceof Error ? e.message : ''),
            );
        },
      },
    ]);
  };
  const field = (
    label: string,
    value: string,
    setter: (value: string) => void,
    length: number,
  ) => (
    <View style={{ gap: 5, flex: 1 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={value}
        onChangeText={setter}
        maxLength={length}
        accessibilityLabel={label}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={c.muted}
        style={{
          color: c.text,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          padding: 10,
        }}
      />
    </View>
  );

  return (
    <Panel>
      <Heading>{t('actualWorkTitle')}</Heading>
      <Muted>{t('actualSelfReportedWarning')}</Muted>
      <Muted>{t('actualRecordingZone', { timeZone })}</Muted>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {field(t('actualStartClock'), startClock, setStartClock, 5)}
        {field(t('actualEndClock'), endClock, setEndClock, 5)}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {field(t('actualEndDate'), endDate, setEndDate, 10)}
        {field(t('actualBreak'), breakText, setBreakText, 4)}
      </View>
      {renderClockChoice(t('actualStartClock'), date, startClock, startChoice, setStartChoice)}
      {renderClockChoice(t('actualEndClock'), endDate, endClock, endChoice, setEndChoice)}
      {field(t('actualNote'), note, setNote, 200)}
      <Action label={t('saveActualEntry')} disabled={saving} onPress={() => void save()} />
      {loading ? (
        <Muted>{t('loading')}</Muted>
      ) : sessions.length ? (
        <View style={{ gap: 12 }}>
          <Heading>{t('recordedActualWork')}</Heading>
          {sessions.map((session) => (
            <View
              key={session.id}
              style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10, gap: 4 }}
            >
              <Text style={{ color: c.text }}>
                {session.localDate} {session.startClock} – {session.endDate} {session.endClock}
              </Text>
              <Muted>
                {t('actualNetDuration', {
                  minutes: Math.floor(session.netLoggedSeconds / 60),
                })}
              </Muted>
              <Muted>{t('actualSessionZone', { zone: session.timeZone })}</Muted>
              {session.note ? <Muted>{session.note}</Muted> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('delete')}
                onPress={() => remove(session.id)}
              >
                <Text style={{ color: c.danger, fontWeight: '700' }}>{t('delete')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Muted>{t('noActualEntries')}</Muted>
      )}
      <Muted>{t('notPaySlip')}</Muted>
    </Panel>
  );
}
