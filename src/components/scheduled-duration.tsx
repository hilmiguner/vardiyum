import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ShiftTemplate } from '../domain/shift-engine';
import { resolveShiftInterval, type ShiftInterval } from '../domain/zoned-shift-time';
import { usePalette } from '../theme/colors';

interface Props {
  date: string;
  template: ShiftTemplate;
  timeZone: string;
}

const REASONS = {
  NONEXISTENT_START: 'nonexistentStart',
  NONEXISTENT_END: 'nonexistentEnd',
  AMBIGUOUS_START: 'ambiguousStart',
  AMBIGUOUS_END: 'ambiguousEnd',
  END_NOT_AFTER_START: 'invalidElapsedInterval',
} as const;

/**
 * Display-only gross elapsed time. This never populates a payroll/work entry.
 * Ambiguous boundaries are intentionally NOT guessed.
 */
export function ScheduledDuration({ date, template, timeZone }: Props) {
  const { t } = useTranslation();
  const c = usePalette();
  const interval = useMemo<ShiftInterval | null>(() => {
    try {
      return resolveShiftInterval(date, template, timeZone);
    } catch {
      // A corrupt/unsupported zone must not crash the entire calendar.
      return null;
    }
  }, [date, template, timeZone]);

  if (interval?.status === 'rest') return null;

  const wallMinutes = interval?.wallMinutes;
  const displayedDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return t('hoursAndMinutes', {
      hours,
      minutes: String(minutes).padStart(2, '0'),
      seconds: seconds ? `:${String(seconds).padStart(2, '0')}` : '',
    });
  };

  return (
    <View style={{ gap: 4 }} accessibilityRole="summary">
      {wallMinutes !== undefined ? (
        <Text style={{ color: c.muted, fontSize: 13 }}>
          {t('wallClockDuration', { duration: displayedDuration(wallMinutes * 60) })}
        </Text>
      ) : null}
      {interval?.status === 'resolved' ? (
        <>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>
            {t('actualElapsedTime', { duration: displayedDuration(interval.elapsedSeconds) })}
          </Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>
            {t('unpaidBreakNotDeducted', { breakMinutes: interval.breakMinutesPlanned })}
          </Text>
        </>
      ) : (
        <Text style={{ color: c.danger, fontSize: 13, fontWeight: '600' }}>
          {interval?.status === 'unresolved'
            ? t(REASONS[interval.reason])
            : t('invalidScheduleTimeZone')}
        </Text>
      )}
      <Text style={{ color: c.muted, fontSize: 12 }}>
        {t('scheduledTimeZone', { timeZone })}
      </Text>
      <Text style={{ color: c.muted, fontSize: 12 }}>{t('notActualWorkRecord')}</Text>
    </View>
  );
}
