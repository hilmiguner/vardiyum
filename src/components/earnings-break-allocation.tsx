import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  saveBreakAllocation, type BreakAllocationCandidate,
} from '../data/earnings-repository';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

export function EarningsBreakAllocationPanel({
  candidates, onSaved,
}: {
  candidates: readonly BreakAllocationCandidate[];
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (!candidates.length) return null;
  const save = async (item: BreakAllocationCandidate) => {
    const value = inputs[item.workId] ??
      (item.chosenStartMinutes === null ? '' : String(item.chosenStartMinutes));
    if (!/^[0-9]+$/.test(value)) {
      Alert.alert(t('earnBreakInvalid'));
      return;
    }
    setBusy(item.workId);
    try {
      await saveBreakAllocation(item.workId, Number(value));
      await onSaved();
      Alert.alert(t('earnBreakSaved'));
    } catch (reason) {
      Alert.alert(
        t('earnBreakInvalid'),
        reason instanceof Error ? reason.message : 'INVALID_BREAK_ALLOCATION',
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <Panel>
      <Heading>{t('earnBreakSplitTitle')}</Heading>
      <Muted>{t('earnBreakSplitExplanation')}</Muted>
      {candidates.map((item) => (
        <View key={item.workId} style={{ gap: 9, paddingVertical: 9,
          borderBottomWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.text, fontWeight: '700' }}>{item.workId}</Text>
          <Muted>{item.startInstantUtc} — {item.endInstantUtc} ({item.timeZone})</Muted>
          <Muted>{t('earnBreakTotal', { minutes: item.originalBreakMinutes })}</Muted>
          <Muted>{t('earnBreakStartMonth', { month: item.startPeriodKey })}</Muted>
          <TextInput
            accessibilityLabel={t('earnBreakStartMonth', { month: item.startPeriodKey })}
            value={inputs[item.workId] ??
              (item.chosenStartMinutes === null ? '' : String(item.chosenStartMinutes))}
            onChangeText={(value) => setInputs((before) => ({
              ...before, [item.workId]: value,
            }))}
            maxLength={4} keyboardType="number-pad" placeholder="0"
            placeholderTextColor={c.muted}
            style={{ borderWidth: 1, borderColor: c.border, color: c.text,
              borderRadius: 11, padding: 12 }}
          />
          <Action label={t('earnSaveBreakSplit')}
            disabled={busy !== null} onPress={() => void save(item)} />
        </View>
      ))}
      <Muted>{t('earnBreakAuditHint')}</Muted>
    </Panel>
  );
}
