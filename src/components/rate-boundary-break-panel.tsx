import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadRateBoundaryBreakCandidates,
  saveRateBoundaryBreakRevision,
} from '../data/rate-boundary-break-repository';
import type { RateBreakCandidate } from '../domain/rate-boundary-break-store';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * This declaration records break timing, NOT a claim about legal overtime,
 * employer-paid wages or a change to calendar-month financial history.
 */
export function RateBoundaryBreakPanel({
  periodKey,
  timeZone,
  onSaved,
}: {
  periodKey: string;
  timeZone: string;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadRateBoundaryBreakCandidates>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError(null);
      void loadRateBoundaryBreakCandidates(periodKey, timeZone)
        .then((next) => {
          if (active) setResult(next);
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : 'RATE_BREAK_READ_FAILED');
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refresh]),
  );

  const save = async (candidate: RateBreakCandidate) => {
    const raw =
      drafts[candidate.workId] ??
      (candidate.chosenBeforeMinutes === null ? '' : String(candidate.chosenBeforeMinutes));
    const reason = reasons[candidate.workId] ?? '';
    const beforeMinutes = Number(raw);
    if (
      !/^[0-9]+$/.test(raw) ||
      !Number.isSafeInteger(beforeMinutes) ||
      beforeMinutes > candidate.originalBreakMinutes ||
      beforeMinutes > candidate.maxBeforeMinutes ||
      candidate.originalBreakMinutes - beforeMinutes > candidate.maxAfterMinutes ||
      reason.trim().length < 3 ||
      reason.trim().length > 160
    ) {
      Alert.alert(t('earnRateBreakInvalid'));
      return;
    }
    setBusyId(candidate.workId);
    try {
      await saveRateBoundaryBreakRevision({
        workId: candidate.workId,
        startDay: candidate.startDay,
        periodKey: candidate.periodKey,
        scheduleTimeZone: timeZone,
        effectiveDate: candidate.effectiveDate,
        beforeRateBreakMinutes: beforeMinutes,
        expectedRevision: candidate.revision,
        reason,
      });
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[candidate.workId];
        return next;
      });
      setReasons((previous) => {
        const next = { ...previous };
        delete next[candidate.workId];
        return next;
      });
      setRefresh((previous) => previous + 1);
      onSaved?.();
      Alert.alert(t('earnRateBreakSaved'));
    } catch (reason) {
      Alert.alert(
        t('earnRateBreakInvalid'),
        reason instanceof Error ? reason.message : 'RATE_BREAK_SAVE_FAILED',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (result?.startDay === 1 && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnRateBreakTitle')}</Heading>
      <Muted>{t('earnRateBreakExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !result ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          {result.unsupportedCrossPeriodCount > 0 ? (
            <Muted>
              {t('earnRateBreakCrossPeriodUnavailable', {
                count: result.unsupportedCrossPeriodCount,
              })}
            </Muted>
          ) : null}
          {result.candidates.length === 0 ? (
            <Muted>{t('earnRateBreakNone')}</Muted>
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
                  {candidate.sourceStartUtc} — {candidate.sourceEndUtc} ({candidate.timeZone})
                </Muted>
                <Muted>
                  {t('earnRateBreakMidnight', {
                    date: candidate.effectiveDate,
                    utc: candidate.boundaryUtc,
                  })}
                </Muted>
                <Muted>
                  {t('earnRateBreakTotal', { minutes: candidate.originalBreakMinutes })}
                </Muted>
                <Muted>
                  {t('earnRateBreakLimits', {
                    before: candidate.maxBeforeMinutes,
                    after: candidate.maxAfterMinutes,
                  })}
                </Muted>
                <Muted>{t('earnRateBreakBefore')}</Muted>
                <TextInput
                  accessibilityLabel={t('earnRateBreakBefore')}
                  keyboardType="number-pad"
                  value={
                    drafts[candidate.workId] ??
                    (candidate.chosenBeforeMinutes === null
                      ? ''
                      : String(candidate.chosenBeforeMinutes))
                  }
                  onChangeText={(value) =>
                    setDrafts((previous) => ({ ...previous, [candidate.workId]: value }))
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
                <Muted>{t('earnRateBreakReason')}</Muted>
                <TextInput
                  accessibilityLabel={t('earnRateBreakReason')}
                  value={reasons[candidate.workId] ?? ''}
                  onChangeText={(value) =>
                    setReasons((previous) => ({ ...previous, [candidate.workId]: value }))
                  }
                  maxLength={160}
                  placeholder={t('earnRateBreakReasonPlaceholder')}
                  placeholderTextColor={palette.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    color: palette.text,
                    borderRadius: 11,
                    padding: 12,
                  }}
                />
                <Muted>
                  {t('earnRateBreakRevision', { revision: candidate.revision })}
                </Muted>
                <Action
                  label={t('earnRateBreakSave')}
                  disabled={busyId !== null}
                  onPress={() => void save(candidate)}
                />
              </View>
            ))
          )}
        </>
      )}
      <Muted>{t('earnRateBreakNotPayslip')}</Muted>
    </Panel>
  );
}
