import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getReminderOptIn, setReminderOptIn } from '../data/reminder-repository';
import {
  hasNotificationPermission,
  requestNotificationPermission,
} from '../services/routine-notifications';
import { useAppState } from '../state/app-state';
import { usePalette } from '../theme/colors';
import { Action, Heading, Muted, Panel } from './ui';

export function ReminderConsentPanel() {
  const { t } = useTranslation();
  const c = usePalette();
  const { refreshReminders } = useAppState();
  const [optedIn, setOptedIn] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getReminderOptIn(), hasNotificationPermission()])
        .then(([enabled, permission]) => {
          if (active) {
            setOptedIn(enabled);
            setAllowed(permission);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : 'REMINDER_PERMISSION_ERROR');
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const toggle = async () => {
    setBusy(true);
    try {
      if (optedIn) {
        await setReminderOptIn(false);
        setOptedIn(false);
        refreshReminders();
      } else {
        // Permission prompts happen ONLY here, in response to this button.
        const permission = await requestNotificationPermission();
        setAllowed(permission);
        await setReminderOptIn(permission);
        setOptedIn(permission);
        refreshReminders();
        if (!permission) Alert.alert(t('reminderPermissionDenied'));
      }
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'REMINDER_PERMISSION_ERROR');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Heading>{t('reminderGlobalTitle')}</Heading>
      <Muted>{t('reminderGlobalExplanation')}</Muted>
      <Text style={{ color: optedIn && allowed ? c.text : c.muted }}>
        {t(
          optedIn && allowed
            ? 'reminderPermissionOn'
            : optedIn
              ? 'reminderPermissionDenied'
              : 'reminderPermissionOff',
        )}
      </Text>
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      <Action
        label={t(optedIn ? 'disableReminders' : 'enableReminders')}
        disabled={busy}
        onPress={() => void toggle()}
      />
      <Muted>{t('reminderBestEffort')}</Muted>
    </Panel>
  );
}
