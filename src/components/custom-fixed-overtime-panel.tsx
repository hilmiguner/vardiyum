import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  loadFixedOvertimeView,
  saveFixedOvertimeDecision,
} from '../data/custom-fixed-overtime-repository';
import type { FixedOvertimeView } from '../domain/custom-fixed-overtime-store';
import type { FixedOvertimeDecision } from '../domain/custom-fixed-overtime-policy';
import { formatMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

/**
 * Fixed salary base-only remains a separate report. The combined PRE-TAX
 * preview appears only after a user explicitly includes logged overtime
 * using the current immutable fixed base and profile overtime threshold.
 */
export function CustomFixedOvertimePanel({
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
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const [view, setView] = useState<FixedOvertimeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<FixedOvertimeDecision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setView(null);
      setChoice(null);
      setReason('');
      setError(null);
      void loadFixedOvertimeView(periodKey, timeZone)
        .then(result => {
          if(active) setView(result);
        })
        .catch((failure: unknown) => {
          if(active)
            setError(failure instanceof Error ? failure.message : 'FIXED_OVERTIME_VIEW_FAILED');
        });
      return () => { active = false; };
    }, [periodKey, timeZone, refreshRevision, reload]),
  );

  const save = async () => {
    if (!view || view.status !== 'review' || !choice ||
        reason.trim().length < 3 || reason.trim().length > 160) {
      Alert.alert(t('earnFixedOtInvalid'));
      return;
    }
    setBusy(true);
    try {
      await saveFixedOvertimeDecision({
        periodKey, startDay:view.startDay, scheduleTimeZone:timeZone,
        decision:choice, expectedRevision:view.latestRevision, reason,
      });
      setReload(value=>value+1);
      onSaved?.();
      Alert.alert(t('earnFixedOtSaved'));
    }catch(failure){
      Alert.alert(
        t('earnFixedOtInvalid'),
        failure instanceof Error ? failure.message : '',
      );
    }finally{setBusy(false);}
  };

  if (view?.status === 'not_applicable' && !error) return null;
  return (
    <Panel>
      <Heading>{t('earnFixedOtTitle')}</Heading>
      <Muted>{t('earnFixedOtExplanation')}</Muted>
      {error ? (
        <Text style={{ color:palette.danger }}>{error}</Text>
      ) : !view ? (
        <Muted>{t('loading')}</Muted>
      ) : view.status !== 'review' ? (
        <>
          <Text style={{ color:palette.danger,fontWeight:'700' }}>
            {t('earnFixedOtState_'+view.status)}
          </Text>
          {view.reasons.map(item=><Muted key={item}>{item}</Muted>)}
        </>
      ) : (
        <>
          <Muted>{t('earnFixedOtSource',{
            id:view.profileId,
            revision:view.profileRevision,
            baseRevision:view.baseRevision,
            base:formatMoneyMinor(view.baseMinorUnits,view.currency,locale),
          })}</Muted>
          <Muted>{t('earnFixedOtRate',{
            threshold:view.thresholdMinutes,
            rate:formatMoneyMinor(view.overtimeHourlyMinorUnits,view.currency,locale),
            numerator:view.multiplierNumerator,
            denominator:view.multiplierDenominator,
          })}</Muted>
          {view.stale ? (
            <Text style={{color:palette.danger,fontWeight:'700'}}>
              {t('earnFixedOtStale')}
            </Text>
          ) : null}
          {view.estimate.status==='estimated' ? (
            <>
              <Muted>{t('earnFixedOtCombinedScope')}</Muted>
              <Text style={{color:palette.text,fontSize:25,fontWeight:'800'}}>
                {formatMoneyMinor(view.estimate.combinedMinorUnits,view.currency,locale)}
              </Text>
              <Muted>{t('earnFixedOtSum',{
                base:formatMoneyMinor(view.estimate.baseMinorUnits,view.currency,locale),
                overtime:formatMoneyMinor(view.estimate.overtimeMinorUnits,view.currency,locale),
              })}</Muted>
              <Muted>{t('earnFixedOtSeconds',{
                logged:view.estimate.loggedSeconds,
                regular:view.estimate.regularSeconds,
                overtime:view.estimate.overtimeSeconds,
              })}</Muted>
              {view.estimate.lines.map((line,index)=>(
                <View key={line.workId+':'+index} style={{
                  paddingVertical:8,gap:5,borderBottomWidth:1,borderColor:palette.border,
                }}>
                  <Muted>{t('earnFixedOtLine',{
                    work:line.workId,
                    seconds:line.overtimeSeconds,
                    amount:formatMoneyMinor(line.overtimeMinorUnits,view.currency,locale),
                    audit:line.breakAuditRevision??'-',
                  })}</Muted>
                  <Muted>{line.segmentStartUtc} → {line.segmentEndUtc} ({line.timeZone})</Muted>
                </View>
              ))}
            </>
          ) : view.estimate.status==='excluded' ? (
            <Muted>{t('earnFixedOtExcluded')}</Muted>
          ) : view.estimate.status==='needs_consent' ? (
            <Muted>{t('earnFixedOtNeedsConsent')}</Muted>
          ) : view.estimate.status==='stale_consent' ? (
            <Text style={{color:palette.danger}}>{t('earnFixedOtStale')}</Text>
          ) : (
            <>
              <Text style={{color:palette.danger,fontWeight:'700'}}>
                {t('earnFixedOtBlocked')}
              </Text>
              {view.estimate.reasons.map(r=><Muted key={r}>{r}</Muted>)}
            </>
          )}
          <Muted>{t('earnFixedOtSelection')}</Muted>
          <View style={{flexDirection:'row',gap:8}}>
            {(['include_logged_overtime','exclude_logged_overtime'] as const).map(mode=>(
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{selected:choice===mode}}
                onPress={()=>setChoice(mode)}
                style={{
                  flex:1,borderWidth:1,borderRadius:10,padding:12,
                  borderColor:choice===mode?palette.accent:palette.border,
                }}
              >
                <Text style={{
                  color:palette.text,
                  textAlign:'center',
                  fontWeight:choice===mode?'800':'400',
                }}>
                  {t(mode==='include_logged_overtime'?'earnFixedOtInclude':'earnFixedOtExclude')}
                </Text>
              </Pressable>
            ))}
          </View>
          <Muted>{t('earnFixedOtReason')}</Muted>
          <TextInput
            accessibilityLabel={t('earnFixedOtReason')}
            value={reason}
            onChangeText={setReason}
            placeholder={t('earnFixedOtReasonPlaceholder')}
            maxLength={160}
            placeholderTextColor={palette.muted}
            style={{
              padding:12,borderWidth:1,borderRadius:12,
              borderColor:palette.border,color:palette.text,
            }}
          />
          <Muted>{t('earnFixedOtRevision',{revision:view.latestRevision})}</Muted>
          <Action
            label={t('earnFixedOtSave')}
            disabled={busy || choice===null}
            onPress={()=>void save()}
          />
        </>
      )}
      <Muted>{t('earnFixedOtNotPayslip')}</Muted>
    </Panel>
  );
}
