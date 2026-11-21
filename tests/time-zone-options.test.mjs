import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterTimeZoneChoices,
  humanTimeZoneLabel,
  timeZoneChoices,
} from '../src/domain/time-zone-options.ts';

test('picker keeps current and device zones and deduplicates them', () => {
  const list = timeZoneChoices('Europe/Istanbul', 'Europe/Istanbul');
  assert.equal(list.filter((zone) => zone === 'Europe/Istanbul').length, 1);
  assert.ok(list.includes('America/New_York'));
  assert.ok(list.includes('Asia/Kathmandu'));
});

test('invalid device zone does not appear as a selectable option', () => {
  const list = timeZoneChoices('Europe/Istanbul', 'Not/A_Real_Zone');
  assert.equal(list.includes('Not/A_Real_Zone'), false);
});

test('localized city and technical IANA id are searchable', () => {
  const list = ['Europe/Istanbul', 'America/New_York', 'Asia/Kathmandu'];
  assert.deepEqual(filterTimeZoneChoices(list, 'İstanbul', 'tr'), ['Europe/Istanbul']);
  assert.deepEqual(filterTimeZoneChoices(list, 'Turkey', 'en'), ['Europe/Istanbul']);
  assert.deepEqual(filterTimeZoneChoices(list, 'New_York', 'en'), ['America/New_York']);
  assert.ok(humanTimeZoneLabel('America/New_York', 'en').includes('New York'));
});

test('non-curated IANA identifiers get legible fallback labels', () => {
  assert.equal(humanTimeZoneLabel('Pacific/Auckland', 'tr'), 'Pacific · Auckland');
});
