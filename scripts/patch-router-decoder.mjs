import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import process from 'node:process';

// query-string 7 expects a CommonJS function. The upstream fixed decoder is ESM.
// Keep the original parser and use its patched upstream decoder's default export.
const requireFromApp = createRequire(import.meta.url);
const routerRequire = createRequire(requireFromApp.resolve('expo-router/entry'));
const queryEntry = routerRequire.resolve('query-string');
const queryRequire = createRequire(queryEntry);
const decoderEntry = queryRequire.resolve('decode-uri-component');

const readManifest = (entry) =>
  JSON.parse(readFileSync(join(dirname(entry), 'package.json'), 'utf8'));

assert.equal(readManifest(queryEntry).name, 'query-string');
assert.equal(readManifest(queryEntry).version, '7.1.3');
assert.equal(readManifest(decoderEntry).name, 'decode-uri-component');
assert.equal(readManifest(decoderEntry).version, '0.5.1');
assert.equal(typeof queryRequire('decode-uri-component').default, 'function');

const before = "const decodeComponent = require('decode-uri-component');";
const after = "const decodeComponent = require('decode-uri-component').default;";
const original = readFileSync(queryEntry, 'utf8');
const checkOnly = process.argv.includes('--check');

if (!checkOnly && original.split(before).length === 2 && !original.includes(after)) {
  writeFileSync(queryEntry, original.replace(before, after), 'utf8');
}

const current = readFileSync(queryEntry, 'utf8');
assert.equal(current.split(after).length, 2, 'Expected exactly one patched decoder import');
assert.ok(!current.includes(before), 'Unpatched decoder import remains');

const query = routerRequire('query-string');
const sample = 'T\u00fcrk\u00e7e + 100%';
assert.equal(query.parse(query.stringify({ name: sample })).name, sample);
assert.deepEqual(query.parse('day=1&day=2').day, ['1', '2']);
assert.equal(query.parse('empty=&flag').empty, '');
assert.equal(query.parse('empty=&flag').flag, null);
assert.equal(query.parse('name=a+b').name, 'a b');
assert.equal(query.parse('value=%').value, '%');
console.log('ROUTER_DECODER_COMPAT=PASS');
