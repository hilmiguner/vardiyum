import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadDualBoundaryBreakCandidates,
  saveDualBoundaryBreakRevision,
} from '../data/dual-boundary-break-repository';
import type { DualBoundaryCandidate } from '../domain/dual-boundary-break-store';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * User's SECOND break declaration is scoped to the current revision of the
 * first pay-period declaration. Corrections invalidate the old rate split.
 */
export function DualBoundaryBreakPanel({
  periodKey,
  timeZone,
  refreshRevision,
  onSaved,
}: {
  periodKey: string;
  timeZone: string;
  refreshRevision: number;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadDualBoundaryBreakCandidates>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError(null);
      void loadDualBoundaryBreakCandidates(periodKey, timeZone)
        .then((loaded) => {
          if (!active) return;
          setResult(loaded);
        })
        .catch((reason: unknown) => {
          if (!active) return;
          setError(reason instanceof Error ? reason.message : 'DUAL_BREAK_READ_FAILED');
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refreshRevision, reload]),
  );

  const save = async (candidate: DualBoundaryCandidate) => {
    const raw =
      drafts[candidate.workId] ??
      (candidate.stale || candidate.chosenBeforeMinutes === null
        ? ''
        : String(candidate.chosenBeforeMinutes));
    const reason = reasons[candidate.workId] ?? '';
    const before = Number(raw);
    if (
      !/^[0-9]+$/.test(raw) ||
      !Number.isSafeInteger(before) ||
      before < 0 ||
      before > candidate.portionBreakMinutes ||
      before > candidate.maxBeforeMinutes ||
      candidate.portionBreakMinutes - before > candidate.maxAfterMinutes ||
      reason.trim().length < 3 ||
      reason.trim().length > 160
    ) {
      Alert.alert(t('earnDualBreakInvalid'));
      return;
    }
    setBusyId(candidate.workId);
    try {
      await saveDualBoundaryBreakRevision({
        workId: candidate.workId,
        startDay: candidate.startDay,
        periodKey: candidate.periodKey,
        scheduleTimeZone: timeZone,
        effectiveDate: candidate.effectiveDate,
        beforeRateBreakMinutes: before,
        expectedRevision: candidate.revision,
        reason,
      });
      setDrafts((old) => {
        const next = { ...old };
        delete next[candidate.workId];
        return next;
      });
      setReasons((old) => {
        const next = { ...old };
        delete next[candidate.workId];
        return next;
      });
      setReload((old) => old + 1);
      onSaved?.();
      Alert.alert(t('earnDualBreakSaved'));
    } catch (reason) {
      Alert.alert(
        t('earnDualBreakInvalid'),
        reason instanceof Error ? reason.message : 'DUAL_BREAK_SAVE_FAILED',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (result?.startDay === 1 && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnDualBreakTitle')}</Heading>
      <Muted>{t('earnDualBreakExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !result ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          {result.pendingPeriodBreakCount > 0 ? (
            <Muted>
              {t('earnDualBreakNeedsFirst', { count: result.pendingPeriodBreakCount })}
            </Muted>
          ) : null}
          {result.candidates.length === 0 ? (
            <Muted>{t('earnDualBreakNone')}</Muted>
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
                  {t('earnDualBreakContext', {
                    period: candidate.periodKey,
                    rate: candidate.effectiveDate,
                    utc: candidate.rateBoundaryUtc,
                    audit: candidate.payPeriodAuditRevision,
                  })}
                </Muted>
                <Muted>
                  {t('earnDualBreakAmounts', {
                    original: candidate.originalBreakMinutes,
                    portion: candidate.portionBreakMinutes,
                    before: candidate.maxBeforeMinutes,
                    after: candidate.maxAfterMinutes,
                  })}
                </Muted>
                {candidate.stale ? (
                  <Text style={{ color: palette.danger }}>
                    {t('earnDualBreakStale')}
                  </Text>
                ) : null}
                <Muted>{t('earnDualBreakBefore')}</Muted>
                <TextInput
                  accessibilityLabel={t('earnDualBreakBefore')}
                  keyboardType="number-pad"
                  value={
                    drafts[candidate.workId] ??
                    (candidate.stale || candidate.chosenBeforeMinutes === null
                      ? ''
                      : String(candidate.chosenBeforeMinutes))
                  }
                  onChangeText={(value) =>
                    setDrafts((old) => ({ ...old, [candidate.workId]: value }))
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
                <Muted>{t('earnDualBreakReason')}</Muted>
                <TextInput
                  accessibilityLabel={t('earnDualBreakReason')}
                  value={reasons[candidate.workId] ?? ''}
                  onChangeText={(value) =>
                    setReasons((old) => ({ ...old, [candidate.workId]: value }))
                  }
                  maxLength={160}
                  placeholder={t('earnDualBreakReasonPlaceholder')}
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
                  {t('earnDualBreakRevision', { revision: candidate.revision })}
                </Muted>
                <Action
                  label={t('earnDualBreakSave')}
                  disabled={busyId !== null}
                  onPress={() => void save(candidate)}
                />
              </View>
            ))
          )}
        </>
      )}
      <Muted>{t('earnDualBreakNotPayslip')}</Muted>
    </Panel>
  );
}
