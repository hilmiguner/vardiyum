import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(
  new URL('../src/app/(tabs)/_layout.tsx', import.meta.url),
  'utf8',
);

test('Android tab bar layout anchors', () => {
  const required = [
    "edges={isAndroid ? ['bottom'] : []}",
    'const bottomInset = isAndroid ? 0 :',
    "tabBarLabelPosition: 'below-icon'",
    'tabBarItemStyle:',
    "alignItems: 'center'",
    "justifyContent: 'center'",
    'tabBarActiveBackgroundColor: c.card',
    'tabBarInactiveBackgroundColor: c.card',
    "textAlign: 'center'",
    'width: 28',
    'height: 28',
    'lineHeight: 28',
    "textAlignVertical: 'center'",
    'includeFontPadding: false',
  ];

  for (const snippet of required) {
    assert.ok(layout.includes(snippet), `Missing tab layout: ${snippet}`);
  }
});
