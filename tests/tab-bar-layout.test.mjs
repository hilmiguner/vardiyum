import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(
  new URL('../src/app/(tabs)/_layout.tsx', import.meta.url),
  'utf8',
);

test('Android tabs reserve their OS bottom inset outside the navigator', () => {
  assert.match(layout, /edges=\{isAndroid \? \['bottom'\] : \[\]\}/);
  assert.match(layout, /const bottomInset = isAndroid \? 0 :/);
});

test('tab glyphs and labels use explicit centered layouts', () => {
  assert.match(layout, /tabBarLabelPosition: 'below-icon'/);
  assert.match(layout, /tabBarItemStyle: \{ alignItems: 'center', justifyContent: 'center' \}/);
  assert.match(layout, /tabBarActiveBackgroundColor: c\.card/);
  assert.match(layout, /tabBarInactiveBackgroundColor: c\.card/);
  assert.match(layout, /tabBarLabelStyle: \{[^\n]*textAlign: 'center'/);
  assert.match(layout, /width: 28,\s*height: 28,\s*lineHeight: 28,/);
  assert.match(layout, /textAlignVertical: 'center'/);
  assert.match(layout, /includeFontPadding: false/);
});
