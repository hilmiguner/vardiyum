import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8');

test('bottom tabs retain centered geometry, safe area and navigation semantics', () => {
  const expected = [
    "SafeAreaView edges={['bottom']}",
    'height: 64',
    "flexDirection: 'row'",
    'state.routes.map',
    'flex: 1',
    "alignItems: 'center'",
    "justifyContent: 'center'",
    'height: 28',
    'lineHeight: 26',
    'lineHeight: 16',
    'includeFontPadding: false',
    'numberOfLines={1}',
    'accessibilityRole="tab"',
    'accessibilityState={{ selected: focused }}',
    "type: 'tabPress'",
    'canPreventDefault: true',
    '!focused && !event.defaultPrevented',
    'navigation.navigate(route.name, route.params)',
    "type: 'tabLongPress'",
    "name: 'index'",
    "name: 'calendar'",
    "name: 'routines'",
    "name: 'earnings'",
  ];

  for (const fragment of expected) {
    assert.ok(source.includes(fragment), `Missing tab layout: ${fragment}`);
  }

  assert.ok(!source.includes('tabBarLabelPosition'));
  assert.ok(!source.includes('tabBarItemStyle'));
  assert.ok(!source.includes('tabBarStyle:'));
});

test('compact tab labels fit without scaling decorative glyphs or losing spoken labels', () => {
  for (const fragment of [
    'allowFontScaling={false}',
    'maxFontSizeMultiplier={1.4}',
    'adjustsFontSizeToFit',
    'minimumFontScale={0.85}',
    'paddingHorizontal: 3',
    "width: '100%'",
    'accessibilityLabel={options.tabBarAccessibilityLabel ?? label}',
  ]) {
    assert.ok(source.includes(fragment), fragment);
  }
});
