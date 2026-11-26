import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('router query parser uses the patched upstream decoder after every install', () => {
  const script = fileURLToPath(new URL('../scripts/patch-router-decoder.mjs', import.meta.url));
  const result = execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.match(result, /ROUTER_DECODER_COMPAT=PASS/);
});
