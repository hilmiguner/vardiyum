import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync(
  new URL('../src/app/(tabs)/earnings.tsx', import.meta.url),
  'utf8',
);

test('profile revision confirmation uses a short title and full message', () => {
  assert.ok(screen.includes("Alert.alert(t('earnProfileSaved'), t('earnRevisionSaved'))"));
  assert.ok(!screen.includes("Alert.alert(t(initial ? 'earnRevisionSaved' : 'earnProfileSaved'))"));
});
