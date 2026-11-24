import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const path = new URL('../src/app/(tabs)/earnings.tsx', import.meta.url);
const screen = readFileSync(path, 'utf8');

test('profile revision confirmation uses a short title and full message', () => {
  const expected = "Alert.alert(t('earnProfileSaved'), t('earnRevisionSaved'))";
  const previous = "Alert.alert(t(initial ? 'earnRevisionSaved' : 'earnProfileSaved'))";
  assert.ok(screen.includes(expected));
  assert.ok(!screen.includes(previous));
});
