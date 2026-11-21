import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/(tabs)/_layout.tsx', import.meta.url),
  'utf8',
);

test('tab navigator reserves OS safe area below a fixed 64dp bar', () => {
  assert.match(source, /SafeAreaView edges=\{\['bottom'\]\}/);
  assert.match(source, /height: 64/);
  assert.match(source, /flexDirection: 'row'/);
  assert.doesNotMatch(source, /tabBarLabelPosition|tabBarItemStyle|tabBarStyle:/);
});

test('every tab has one vertically centered icon and label touch target', () => {
  assert.match(source, /tabBar=\{\(\{ state, descriptors, navigation \}\) =>/);
  assert.match(source, /state\.routes\.map/);
  assert.match(source, /flex: 1/);
  assert.match(source, /alignItems: 'center'/);
  assert.match(source, /justifyContent: 'center'/);
  assert.match(source, /height: 28/);
  assert.match(source, /lineHeight: 26/);
  assert.match(source, /lineHeight: 16/);
  assert.match(source, /includeFontPadding: false/);
  assert.match(source, /numberOfLines=\{1\}/);
});

test('custom tab buttons preserve navigation events and accessibility', () => {
  assert.match(source, /accessibilityRole="tab"/);
  assert.match(source, /accessibilityState=\{\{ selected: focused \}\}/);
  assert.match(source, /type: 'tabPress'/);
  assert.match(source, /canPreventDefault: true/);
  assert.match(source, /!focused && !event\.defaultPrevented/);
  assert.match(source, /navigation\.navigate\(route\.name, route\.params\)/);
  assert.match(source, /type: 'tabLongPress'/);
});

test('all four tabs remain present', () => {
  for (const name of ['index', 'calendar', 'routines', 'earnings']) {
    assert.ok(source.includes(`name: '${name}'`));
  }
});
