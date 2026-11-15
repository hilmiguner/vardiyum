import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { loadCustomPayProfilePreview } from '../data/custom-pay-profile-repository';
import type { CustomPayProfilePlan } from '../domain/custom-pay-profile-policy';
import { formatMoneyMinor } from '../domain/money-text';
import { usePalette } from '../theme/colors';
import { Heading, Muted, Panel } from './ui';

/**
 * Source-labelled, nonfinancial review screen. It must never be used as an
 * implicit decision to prorate fixed salaries or apply mixed monthly rates.
 */
export function CustomPayProfilePreviewPanel({
  periodKey,
  timeZone,
  refreshRevision,
}: {
  periodKey: string;
  timeZone: string;
  refreshRevision: number;
}) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const locale = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const [plan, setPlan] = useState<CustomPayProfilePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPlan(null);
      setError(null);
      void loadCustomPayProfilePreview(periodKey, timeZone)
        .then((result) => {
          if (active) setPlan(result);
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : 'CUSTOM_PROFILE_PREVIEW_ERROR');
        });
      return () => {
        active = false;
      };
    }, [periodKey, timeZone, refreshRevision]),
  );

  if (plan?.startDay === 1 && !error) return null;

  return (
    <Panel>
      <Heading>{t('earnCustomProfileTitle')}</Heading>
      <Muted>{t('earnCustomProfileExplanation')}</Muted>
      {error ? (
        <Text style={{ color: palette.danger }}>{error}</Text>
      ) : !plan ? (
        <Muted>{t('loading')}</Muted>
      ) : (
        <>
          <Muted>
            {t('earnCustomProfilePeriod', {
              start: plan.startDate,
              end: plan.endDateInclusive,
              zone: plan.timeZone,
            })}
          </Muted>
          <Text
            style={{
              color: plan.status === 'single_hourly_profile' ? palette.text : palette.danger,
              fontWeight: '700',
            }}
          >
            {t('earnCustomProfileStatus_' + plan.status)}
          </Text>
          {plan.segments.map((segment) => (
            <View
              key={segment.startInstantUtc + ':' + segment.profile.id}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: palette.accent,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
                gap: 6,
                padding: 10,
              }}
            >
              <Text style={{ color: palette.text, fontWeight: '700' }}>
                {segment.startDate} – {segment.endDateInclusive}
              </Text>
              <Muted>
                {t('earnCustomProfileSource', {
                  id: segment.profile.id,
                  revision: segment.profile.revision,
                  effective: segment.profile.effectiveFrom,
                })}
              </Muted>
              <Muted>
                {t('earnCustomProfileModel', {
                  model: t(
                    segment.profile.model === 'hourly' ? 'earnModelHourly' : 'earnModelMonthly',
                  ),
                  amount: formatMoneyMinor(
                    segment.profile.baseMinorUnits,
                    segment.profile.currency,
                    locale,
                  ),
                })}
              </Muted>
              <Muted>
                {t('earnCustomProfileUtc', {
                  start: segment.startInstantUtc,
                  end: segment.endInstantUtc,
                })}
              </Muted>
            </View>
          ))}
          <Muted>{t('earnCustomProfileZoneWarning')}</Muted>
        </>
      )}
      <Muted>{t('earnCustomProfileNotApplied')}</Muted>
    </Panel>
  );
}
