import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Page, Panel } from '../components/ui';
import { localDateString, type ShiftCode, validatePattern } from '../domain/shift-engine';
import { SHIFT_PRESENTATION } from '../domain/shift-engine.types';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';

const TYPES: ShiftCode[] = ['morning', 'evening', 'night', 'off'];
const SAMPLE: ShiftCode[] = [
  'morning',
  'morning',
  'evening',
  'evening',
  'night',
  'night',
  'off',
  'off',
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = usePalette();
  const { pattern, savePattern } = useAppState();
  // Derived defaults track the asynchronously loaded pattern without a state-setting effect.
  const [draft, setDraft] = useState<{ anchor: string; days: ShiftCode[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const anchor = draft?.anchor ?? pattern?.anchorDate ?? localDateString();
  const days = draft?.days ?? pattern?.days ?? ['morning', 'evening', 'night', 'off'];
  const setAnchor = (value: string) => setDraft({ anchor: value, days: [...days] });
  const setDays = (update: (before: ShiftCode[]) => ShiftCode[]) => {
    setDraft({ anchor, days: update([...days]) });
  };

  const toggle = (index: number) => {
    setDays((before) =>
      before.map((code, day) =>
        day === index ? TYPES[(TYPES.indexOf(code) + 1) % TYPES.length] : code,
      ),
    );
  };

  const save = async () => {
    let value;
    try {
      value = validatePattern({ anchorDate: anchor, days });
    } catch {
      Alert.alert(t('invalidDate'));
      return;
    }
    setSaving(true);
    try {
      await savePattern(value);
      Alert.alert(t('saved'));
      router.back();
    } catch (error) {
      Alert.alert(t('databaseError'), error instanceof Error ? error.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title={t('settings')} settings={false} subtitle={t('setupSubtitle')}>
      <Panel>
        <Heading>{t('anchorDate')}</Heading>
        <TextInput
          value={anchor}
          onChangeText={setAnchor}
          maxLength={10}
          autoCapitalize="none"
          accessibilityLabel={t('anchorDate')}
          placeholder="2026-11-15"
          placeholderTextColor={c.muted}
          style={{
            color: c.text,
            fontSize: 18,
            backgroundColor: c.cardAlt,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: c.border,
          }}
        />
        <Heading>
          {t('cycle')} ({days.length})
        </Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {days.map((code, index) => (
            <Pressable
              key={index}
              onPress={() => toggle(index)}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. ${t('day')}: ${t(code)}`}
              style={{
                backgroundColor: c.cardAlt,
                borderRadius: 14,
                padding: 12,
                borderBottomWidth: 3,
                borderBottomColor: SHIFT_PRESENTATION[code].color,
              }}
            >
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {index + 1}. {t('day')}
              </Text>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{t(code)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => setDays((prev) => [...prev, 'off'])}
            disabled={days.length >= 366}
            style={{ backgroundColor: c.cardAlt, padding: 12, borderRadius: 10, flex: 1 }}
          >
            <Text style={{ color: c.text, textAlign: 'center' }}>+ {t('addDay')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setDays((prev) => prev.slice(0, -1))}
            disabled={days.length <= 1}
            style={{ backgroundColor: c.cardAlt, padding: 12, borderRadius: 10, flex: 1 }}
          >
            <Text style={{ color: c.text, textAlign: 'center' }}>− {t('removeDay')}</Text>
          </Pressable>
        </View>
        <Action label={t('save')} onPress={() => void save()} disabled={saving} />
      </Panel>
      <Panel>
        <Action
          label={t('example')}
          onPress={() => {
            setAnchor(localDateString());
            setDays(() => [...SAMPLE]);
          }}
        />
        <Muted>{t('exampleHint')}</Muted>
      </Panel>
    </Page>
  );
}
