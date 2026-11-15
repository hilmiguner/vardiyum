import assert from 'node:assert/strict';
import test from 'node:test';

import {
  prepareNextProfileRevision,
  profileVersionHistory,
  resolvePayProfileRevisions,
  validateProfileRevision,
} from '../src/domain/earnings-profile-revisions.ts';
import { estimateEarnings } from '../src/domain/earnings-engine.ts';
import { createEarningsExport } from '../src/domain/earnings-export.ts';

const base = {
  id: 'pay_nov',
  effectiveFrom: '2026-11-01',
  model: 'hourly',
  currency: 'TRY',
  baseMinorUnits: 15000,
  overtimeHourlyMinorUnits: 0,
  overtimeAfterMinutes: null,
  overtimeMultiplierNumerator: 1,
  overtimeMultiplierDenominator: 1,
  revision: 1,
};
const changes = {
  model: 'hourly',
  currency: 'TRY',
  baseMinorUnits: 20000,
  overtimeHourlyMinorUnits: 0,
  overtimeAfterMinutes: null,
  overtimeMultiplierNumerator: 1,
  overtimeMultiplierDenominator: 1,
};
const timestamp = '2026-11-15T13:01:00.000Z';
const row = prepareNextProfileRevision(
  base,
  changes,
  'Original hourly rate entered incorrectly',
  timestamp,
);

test('next correction creates full immutable snapshot, identity and effective month preserved', () => {
  assert.equal(row.profile.id, 'pay_nov');
  assert.equal(row.profile.effectiveFrom, '2026-11-01');
  assert.equal(row.profile.revision, 2);
  assert.equal(row.profile.baseMinorUnits, 20000);
  assert.equal(row.reason, 'Original hourly rate entered incorrectly');
  assert.equal(row.source, 'user_entered');
  assert.equal(base.baseMinorUnits, 15000);
  const history = profileVersionHistory(base, [row]);
  assert.deepEqual(
    history.map((p) => [p.revision, p.baseMinorUnits]),
    [
      [1, 15000],
      [2, 20000],
    ],
  );
});

test('corrections never silently alter the identity or effective date', () => {
  assert.throws(
    () =>
      profileVersionHistory(base, [
        {
          ...row,
          profile: { ...row.profile, effectiveFrom: '2026-12-01' },
        },
      ]),
    /PROFILE_IDENTITY_CHANGED/,
  );
  assert.throws(
    () =>
      profileVersionHistory(base, [
        {
          ...row,
          profile: { ...row.profile, id: 'another' },
        },
      ]),
    /PROFILE_IDENTITY_CHANGED/,
  );
  assert.throws(
    () => profileVersionHistory({ ...base, revision: 2 }, []),
    /INVALID_BASE_PROFILE_REVISION/,
  );
});

test('missing, duplicate, out-of-order and nonmonotonic revisions fail closed', () => {
  const third = {
    ...row,
    profile: { ...row.profile, revision: 3, baseMinorUnits: 22000 },
    recordedAt: '2026-11-15T13:02:00.000Z',
  };
  assert.deepEqual(
    profileVersionHistory(base, [third, row]).map((p) => p.revision),
    [1, 2, 3],
  );
  assert.throws(
    () => profileVersionHistory(base, [third]),
    /MISSING_OR_DUPLICATE_PROFILE_REVISION/,
  );
  assert.throws(
    () => profileVersionHistory(base, [row, row]),
    /MISSING_OR_DUPLICATE_PROFILE_REVISION/,
  );
  assert.throws(
    () =>
      profileVersionHistory(base, [
        third,
        {
          ...row,
          recordedAt: '2026-11-15T13:05:00.000Z',
        },
      ]),
    /NONMONOTONIC_PROFILE_REVISION_TIMESTAMP/,
  );
});

test('a correction requires explanatory reason, UTC timestamp and explicit provenance', () => {
  assert.throws(
    () => prepareNextProfileRevision(base, changes, 'x', timestamp),
    /PROFILE_REVISION_REASON_REQUIRED/,
  );
  assert.throws(
    () => prepareNextProfileRevision(base, changes, '  ', timestamp),
    /PROFILE_REVISION_REASON_REQUIRED/,
  );
  assert.throws(
    () => validateProfileRevision({ ...row, source: 'employer_verified' }),
    /UNVERIFIED_PROFILE_REVISION/,
  );
  assert.throws(
    () => validateProfileRevision({ ...row, recordedAt: 'Nov 15 2026' }),
    /INVALID_PROFILE_REVISION_TIMESTAMP/,
  );
  assert.throws(
    () =>
      prepareNextProfileRevision(
        { ...base, revision: 1_000_000 },
        changes,
        'Please correct',
        timestamp,
      ),
    /PROFILE_REVISION_LIMIT/,
  );
});

test('domain validation rejects negative pay, unsupported currency and invalid overtime', () => {
  assert.throws(
    () =>
      prepareNextProfileRevision(
        base,
        { ...changes, baseMinorUnits: -1 },
        'Correct amount',
        timestamp,
      ),
    /INVALID_MONEY_AMOUNT/,
  );
  assert.throws(
    () =>
      prepareNextProfileRevision(
        base,
        { ...changes, currency: 'JPY' },
        'Correct currency',
        timestamp,
      ),
    /INVALID_CURRENCY/,
  );
  assert.throws(
    () =>
      prepareNextProfileRevision(
        base,
        {
          ...changes,
          overtimeAfterMinutes: 1000,
          overtimeMultiplierNumerator: 1,
          overtimeMultiplierDenominator: 2,
        },
        'Correct multiplier',
        timestamp,
      ),
    /INVALID_MULTIPLIER/,
  );
});

test('resolver chooses latest full snapshot separately for every effective month', () => {
  const dec = { ...base, id: 'pay_dec', effectiveFrom: '2026-12-01', baseMinorUnits: 25000 };
  const result = resolvePayProfileRevisions([base, dec], [row]);
  assert.deepEqual(
    result.map((p) => [p.id, p.revision, p.baseMinorUnits]),
    [
      ['pay_nov', 2, 20000],
      ['pay_dec', 1, 25000],
    ],
  );
  assert.equal(resolvePayProfileRevisions([base], [])[0].baseMinorUnits, 15000);
  assert.throws(
    () =>
      resolvePayProfileRevisions(
        [base],
        [
          {
            ...row,
            profile: { ...row.profile, id: 'nonexistent' },
          },
        ],
      ),
    /ORPHAN_PAY_PROFILE_REVISION/,
  );
});

test('previous rate can be recomputed on current work; CSV/JSON identify selected revision', () => {
  const work = {
    id: 'work_1',
    localDate: '2026-11-15',
    endDate: '2026-11-15',
    timeZone: 'Europe/Istanbul',
    startInstantUtc: '2026-11-15T05:00:00.000Z',
    endInstantUtc: '2026-11-15T07:00:00.000Z',
    breakMinutes: 0,
    source: 'user_entered',
  };
  const original = estimateEarnings('2026-11', [base], [work], []);
  const latest = estimateEarnings(
    '2026-11',
    resolvePayProfileRevisions([base], [row]),
    [work],
    [],
  );
  assert.equal(original.status, 'estimated');
  assert.equal(latest.status, 'estimated');
  assert.equal(original.totalMinorUnits, 30000);
  assert.equal(latest.totalMinorUnits, 40000);
  assert.equal(original.profile.revision, 1);
  assert.equal(latest.profile.revision, 2);
  assert.equal(JSON.parse(createEarningsExport(latest, 'json').content).profile.revision, 2);
  assert.ok(createEarningsExport(original, 'csv').content.includes('"pay_nov",1'));
});

test('same-month profile collisions remain impossible when base versions differ', () => {
  assert.throws(
    () => resolvePayProfileRevisions([base, { ...base, id: 'different' }], []),
    /DUPLICATE_EFFECTIVE_MONTH/,
  );
});
