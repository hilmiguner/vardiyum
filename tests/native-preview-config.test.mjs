import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;

test('MVP stage-2 preview is internal distribution, not store release or Metro-only development client', () => {
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.notEqual(eas.build.preview.developmentClient, true);
  assert.ok(!('submit' in eas), 'Stage 2 never auto-submits to an app store');
});

test('Android physical-device preview is installable APK, not Play Store-only AAB', () => {
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.match(config.android.package, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
});

test('iOS preview targets a registered real device and has a fixed bundle identifier', () => {
  assert.equal(eas.build.preview.ios.simulator, false);
  assert.match(config.ios.bundleIdentifier, /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/);
});

test('preview configuration links only the verified Expo project and contains no secrets', () => {
  const raw = JSON.stringify(eas);
  assert.ok(!/EXPO_TOKEN|API_KEY|PASSWORD|privateKey|projectId|secret/i.test(raw));
  assert.equal(config.extra.eas.projectId, '0ec5a8c3-f277-43d0-82c7-8b822835a4c2');
  assert.ok(
    !/EXPO_TOKEN|API_KEY|PASSWORD|privateKey|secret/i.test(JSON.stringify(config.extra)),
  );
});
