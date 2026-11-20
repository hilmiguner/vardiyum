import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Android tab bar retains safe area and icon centering', () => {
  const source = readFileSync(
    new URL('../src/app/(tabs)/_layout.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /tabBarActiveBackgroundColor: c\.card/);
  assert.match(source, /tabBarLabelPosition: 'below-icon'/);
  assert.match(source, /includeFontPadding: false/);
});
