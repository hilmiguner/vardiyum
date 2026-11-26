import '../i18n';

import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppStateProvider } from '../state/app-state';
import { ReminderCoordinator } from '../components/reminder-coordinator';
import { usePalette } from '../theme/colors';
import { cleanupStaleCustomPayExportFiles } from '../services/custom-pay-export-files';

function Navigation() {
  const c = usePalette();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const { t } = useTranslation();
  useEffect(() => {
    try {
      cleanupStaleCustomPayExportFiles();
    } catch {
      Alert.alert(t('earnCustomExportCleanupTitle'), t('earnCustomExportCleanupFailed'));
    }
  }, [t]);

  return (
    <AppStateProvider>
      <ReminderCoordinator />
      <Navigation />
    </AppStateProvider>
  );
}
