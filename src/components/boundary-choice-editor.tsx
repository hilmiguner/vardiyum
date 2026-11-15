import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ShiftTemplate } from '../domain/shift-engine';
import { addCalendarDays } from '../domain/shift-engine';
import {
  effectiveBoundaryPolicy, scheduleBoundarySignature,
} from '../domain/work-records';
import {
  possibleUtcInstants, resolveShiftInterval, type BoundaryPolicy, type FoldChoice,
} from '../domain/zoned-shift-time';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

interface Props {
  date: string;
  template: ShiftTemplate;
  timeZone: string;
}

const CHOICES: readonly FoldChoice[] = ['reject', 'earlier', 'later'];

export function BoundaryChoiceEditor({ date, template, timeZone }: Props) {
  const { t } = useTranslation();
  const c = usePalette();
  const { boundaryChoices, saveBoundaryChoice } = useAppState();
  const [draft, setDraft] = useState<{
    key: string;
    policy: BoundaryPolicy;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  if (template.isRestDay || !template.startsAt || !template.endsAt) return null;

  const key = date + ':' + scheduleBoundarySignature(template, timeZone);
  const stored = boundaryChoices[date];
  const savedPolicy = effectiveBoundaryPolicy(date, template, timeZone, stored);
  const policy = draft?.key === key ? draft.policy : savedPolicy;
  const startOptions = possibleUtcInstants(date, template.startsAt, timeZone);
  const endOptions = possibleUtcInstants(
    addCalendarDays(date, template.endDayOffset), template.endsAt, timeZone,
  );
  const needsStart = startOptions.length > 1;
  const needsEnd = endOptions.length > 1;
  if (!needsStart && !needsEnd) return null;

  const interval = resolveShiftInterval(date, template, timeZone, policy);
  const change = (side: 'start' | 'end', value: FoldChoice) => {
    setDraft({
      key,
      policy: { start: policy.start, end: policy.end, [side]: value },
    });
  };
  const save = async () => {
    if (interval.status !== 'resolved') return;
    setSaving(true);
    try {
      await saveBoundaryChoice(date, policy);
      setDraft(null);
      Alert.alert(t('boundaryChoiceSaved'));
    } catch (reason) {
      Alert.alert(t('invalidBoundaryChoice'),
        reason instanceof Error ? reason.message : '');
    } finally {
      setSaving(false);
    }
  };
  const reset = async () => {
    setSaving(true);
    try {
      await saveBoundaryChoice(date, null);
      setDraft(null);
    } catch (reason) {
      Alert.alert(t('databaseError'), reason instanceof Error ? reason.message : '');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel>
      <Heading>{t('chooseRepeatedHour')}</Heading>
      <Muted>{t('boundaryDayOnly')}</Muted>
      {([
        ['start', needsStart, startOptions],
        ['end', needsEnd, endOptions],
      ] as const).map(([side, needed, options]) => needed ? (
        <View key={side} style={{ gap: 8 }}>
          <Text style={{ color: c.text, fontWeight: '700' }}>
            {t(side === 'start' ? 'shiftStartBoundary' : 'shiftEndBoundary')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHOICES.map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityState={{ selected: policy[side] === choice }}
                accessibilityLabel={t('boundaryChoiceAccessible', {
                  boundary: t(side === 'start' ? 'shiftStartBoundary' : 'shiftEndBoundary'),
                  choice: t('foldChoice_' + choice),
                })}
                onPress={() => change(side, choice)}
                style={{ padding: 10, borderRadius: 10, borderWidth: 2,
                  borderColor: policy[side] === choice ? c.accent : c.border }}>
                <Text style={{ color: c.text }}>{t('foldChoice_' + choice)}</Text>
              </Pressable>
            ))}
          </View>
          <Muted>{t('possibleUtcInstants', { values: options.join(' / ') })}</Muted>
        </View>
      ) : null)}
      {interval.status === 'resolved' ? (
        <Muted>{t('chosenUtcInterval', {
          start: interval.startInstantUtc,
          end: interval.endInstantUtc,
        })}</Muted>
      ) : (
        <Text style={{ color: c.danger }}>{t('invalidBoundaryChoice')}</Text>
      )}
      <Action label={t('saveBoundaryChoice')} onPress={() => void save()}
        disabled={saving || interval.status !== 'resolved'} />
      {stored && stored.signature === scheduleBoundarySignature(template, timeZone) && (
        <Action label={t('clearBoundaryChoice')} onPress={() => void reset()}
          disabled={saving} />
      )}
    </Panel>
  );
}
