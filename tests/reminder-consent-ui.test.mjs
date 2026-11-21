import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const panel = readFileSync(
  new URL('../src/components/reminder-consent-panel.tsx', import.meta.url),
  'utf8',
);

test('notification denial uses a short localized alert title and the full denial explanation as its message', () => {
  assert.ok(
    panel.includes("Alert.alert(t('reminderGlobalTitle'), t('reminderPermissionDenied'))"),
    'Denied permission must not place the long explanation into the Android alert title',
  );
  assert.ok(!panel.includes("Alert.alert(t('reminderPermissionDenied'))"));
});

test('notification permission remains user-initiated and denied permission stays opted out', () => {
  assert.ok(panel.includes('const permission = await requestNotificationPermission();'));
  assert.ok(panel.includes('await setReminderOptIn(permission);'));
  assert.ok(panel.includes('setOptedIn(permission);'));
  assert.ok(panel.includes('if (!permission) Alert.alert('));
});
