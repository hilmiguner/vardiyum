import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCustomPayExportName,
  purgeCustomPayExportFiles,
} from '../src/domain/custom-pay-export-cleanup.ts';

test('cleanup recognizes only exact owned CSV and JSON export names', () => {
  assert.equal(isCustomPayExportName('vardiyum-custom-estimate-15-2026-11.csv'), true);
  assert.equal(isCustomPayExportName('vardiyum-custom-estimate-26-2026-10.json'), true);
  for (const name of [
    'vardiyum-custom-estimate-1-2026-11.csv',
    'vardiyum-custom-estimate-29-2026-11.csv',
    'vardiyum-custom-estimate-15-2026-13.csv',
    'vardiyum-custom-estimate-15-2026-11.csv.bak',
    'vardiyum-custom-estimate-15-2026-11.csv\n',
    '../vardiyum-custom-estimate-15-2026-11.csv',
    'vardiyum-encrypted-2026-11-21.vdb',
    'vardiyum.db',
  ]) {
    assert.equal(isCustomPayExportName(name), false);
  }
});

test('purge removes only owned exports and preserves unrelated files', () => {
  const removed = [];
  const names = [
    'vardiyum-custom-estimate-15-2026-11.csv',
    'vardiyum-encrypted-2026-11-21.vdb',
    'vardiyum-custom-estimate-15-2026-11.json',
    'vardiyum.db',
  ];
  const files = names.map((name) => ({ name, delete: () => removed.push(name) }));
  purgeCustomPayExportFiles(files);
  assert.deepEqual(removed, [names[0], names[2]]);
});

test('purge attempts remaining owned files after a deletion failure and fails closed', () => {
  let removed = false;
  const files = [
    {
      name: 'vardiyum-custom-estimate-15-2026-11.csv',
      delete: () => {
        throw new Error('private platform path');
      },
    },
    {
      name: 'vardiyum-custom-estimate-15-2026-11.json',
      delete: () => {
        removed = true;
      },
    },
  ];
  assert.throws(() => purgeCustomPayExportFiles(files), /CUSTOM_PAY_EXPORT_CLEANUP_FAILED/);
  assert.equal(removed, true);
});
