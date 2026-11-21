import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const panel = readFileSync(
  new URL('../src/components/reminder-consent-panel.tsx', import.meta.url),
  'utf8',
);

test('denial alert keeps full explanation in message, not title', () => {
  assert.ok(
    panel.includes("Alert.alert(t('reminderGlobalTitle'), t('reminderPermissionDenied'))"),
    'Denied permission must not place the long explanation into the Android alert title',
  );
  assert.ok(!panel.includes("Alert.alert(t('reminderPermissionDenied'))"));
});

test('permission request stays user-initiated and denial does not opt in', () => {
  assert.ok(panel.includes('const permission = await requestNotificationPermission();'));
  assert.ok(panel.includes('await setReminderOptIn(permission);'));
  assert.ok(panel.includes('setOptedIn(permission);'));
  assert.ok(panel.includes('if (!permission) Alert.alert('));
});
