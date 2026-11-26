import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const panelPath = '../src/components/custom-pay-combined-panel.tsx';
const panel = readFileSync(new URL(panelPath, import.meta.url), 'utf8');
const i18n = readFileSync(new URL('../src/i18n/index.ts', import.meta.url), 'utf8');

test('combined estimate displays localized overtime decisions in both languages', () => {
  assert.ok(panel.includes("otPolicy: t('earnCombinedOvertime_' + report.overtimeDecision)"));
  for (const decision of [
    'not_applicable',
    'include_logged_overtime',
    'exclude_logged_overtime',
  ]) {
    const key = 'earnCombinedOvertime_' + decision + ':';
    assert.equal(i18n.split(key).length - 1, 2);
  }
});
