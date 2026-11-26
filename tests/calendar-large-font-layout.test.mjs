import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/(tabs)/calendar.tsx', import.meta.url), 'utf8');

test('calendar date numerals fit one line and retain selected accessibility state', () => {
  for (const fragment of [
    'numberOfLines={1}',
    'maxFontSizeMultiplier={1.4}',
    'adjustsFontSizeToFit',
    'minimumFontScale={0.85}',
    'paddingHorizontal: 1',
    "width: '100%'",
    'accessibilityState={{ selected: active }}',
    '{Number(date.slice(8))}',
  ]) {
    assert.ok(source.includes(fragment), fragment);
  }
});
