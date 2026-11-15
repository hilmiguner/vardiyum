import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadCustomPayBreakCandidates,
  saveCustomPayBreakRevision,
  type CustomPayBreakCandidate,
  type CustomPayBreakCandidateResult,
} from '../data/custom-pay-break-repository';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * Preparatory user declarations ONLY. This panel does not change existing
 * calendar-month estimates, monthly break allocations or CSV/JSON reports.
 */
export function CustomPayBreakPanel({ periodKey }: { periodKey: string }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [result, setResult] = useState<CustomPayBreakCandidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadRevision, setReloadRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCustomPayBreakCandidates(periodKey)
        .then((loaded) => {
          if (!active) return;
          setResult(loaded);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (!active) return;
          setResult(null);
          setError(reason instanceof Error ? reason.message : 'CUSTOM_BREAK_READ_FAILED');
        });
      return () => {
        active = false;
      };
    }, [periodKey, reloadRevision]),
  );

  const save = async (candidate: CustomPayBreakCandidate) => {
    const raw =
      drafts[candidate.workId] ??
      (candidate.chosenStartMinutes === null ? '' : String(candidate.chosenStartMinutes));
    const reason = reasons[candidate.workId] ?? '';
    if (
      !/^[0-9]+$/.test(raw) ||
      !Number.isSafeInteger(Number(raw)) ||
      reason.trim().length < 3 ||
      reason.trim().length > 160
    ) {
      Alert.alert(t('earnCustomBreakInvalid'));
      return;
    }
    setBusyId(candidate.workId);
    try {
      await saveCustomPayBreakRevision({
        workId: candidate.workId,
        startDay: candidate.startDay,
        startPeriodBreakMinutes: Number(raw),
        expectedRevision: candidate.revision,
        reason,
      });
      setDrafts((before) => {
        const next = { ...before };
        delete next[candidate.workId];
        return next;
      });
      setReasons((before) => {
        const next = { ...before };
        delete next[candidate.workId];
        return next;
      });
      setReloadRevision((before) => before + 1);
      Alert.alert(t('earnCustomBreakSaved'));
    } catch (reason) {
      Alert.alert(
        t('earnCustomBreakInvalid'),
        reason instanceof Error ? reason.message : 'CUSTOM_BREAK_SAVE_FAILED',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (result?.startDay === 1 && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnCustomBreakTitle')}</Heading>
      <Muted>{t('earnCustomBreakExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !result ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          <Muted>
            {t('earnCustomBreakSelectedPeriod', {
              day: result.startDay,
              period: periodKey,
            })}
          </Muted>
          {!result.candidates.length ? (
            <Muted>{t('earnCustomBreakNone')}</Muted>
          ) : (
            result.candidates.map((candidate) => (
              <View
                key={candidate.workId}
                style={{
                  gap: 9,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Text style={{ color: palette.text, fontWeight: '700' }}>
                  {candidate.workId}
                </Text>
                <Muted>
                  {candidate.startInstantUtc} — {candidate.endInstantUtc} ({candidate.timeZone})
                </Muted>
                <Muted>
                  {t('earnCustomBreakTotal', { minutes: candidate.originalBreakMinutes })}
                </Muted>
                <Muted>{t('earnCustomBreakFirst', { period: candidate.startPeriodKey })}</Muted>
                <TextInput
                  accessibilityLabel={t('earnCustomBreakFirst', {
                    period: candidate.startPeriodKey,
                  })}
                  keyboardType="number-pad"
                  value={
                    drafts[candidate.workId] ??
                    (candidate.chosenStartMinutes === null
                      ? ''
                      : String(candidate.chosenStartMinutes))
                  }
                  onChangeText={(value) =>
                    setDrafts((before) => ({ ...before, [candidate.workId]: value }))
                  }
                  maxLength={4}
                  placeholder="0"
                  placeholderTextColor={palette.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    color: palette.text,
                    borderRadius: 11,
                    padding: 12,
                  }}
                />
                <Muted>{t('earnCustomBreakReason')}</Muted>
                <TextInput
                  accessibilityLabel={t('earnCustomBreakReason')}
                  value={reasons[candidate.workId] ?? ''}
                  onChangeText={(value) =>
                    setReasons((before) => ({ ...before, [candidate.workId]: value }))
                  }
                  maxLength={160}
                  placeholder={t('earnCustomBreakReasonPlaceholder')}
                  placeholderTextColor={palette.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    color: palette.text,
                    borderRadius: 11,
                    padding: 12,
                  }}
                />
                <Muted>{t('earnCustomBreakRevision', { revision: candidate.revision })}</Muted>
                <Action
                  label={t('earnCustomBreakSave')}
                  disabled={busyId !== null}
                  onPress={() => void save(candidate)}
                />
              </View>
            ))
          )}
        </>
      )}
      <Muted>{t('earnCustomBreakNotEnabled')}</Muted>
    </Panel>
  );
}
