import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCustomPayCombinedExport,
  requireUnchangedCustomPayEstimate,
} from '../src/domain/custom-pay-export.ts';

const workBase = {
  workId: 'work_nov',
  profileId: 'pay_oct',
  profileRevision: 1,
  sourceStartUtc: '2026-11-10T05:00:00.000Z',
  sourceEndUtc: '2026-11-10T06:30:00.000Z',
  segmentStartUtc: '2026-11-10T05:00:00.000Z',
  segmentEndUtc: '2026-11-10T06:30:00.000Z',
  timeZone: 'Europe/Istanbul',
  breakAuditRevision: null,
  rateBreakAuditRevision: 2,
  rateBreakAuditKind: 'rate',
};

function hourly() {
  return {
    status: 'estimated',
    periodKey: '2026-10',
    startDay: 26,
    startDate: '2026-10-26',
    endDateInclusive: '2026-11-25',
    scheduleTimeZone: 'Europe/Istanbul',
    model: 'hourly_actual_work',
    currency: 'TRY',
    profiles: [{ id: 'pay_oct', revision: 1 }],
    baseRevision: null,
    overtimeConsentRevision: null,
    overtimeDecision: 'not_applicable',
    fixedBaseMinorUnits: 0,
    regularWorkMinorUnits: 10_000,
    overtimeMinorUnits: 5_000,
    earningsMinorUnits: 15_000,
    adjustmentMinorUnits: 500,
    totalMinorUnits: 15_500,
    loggedSeconds: 5_400,
    overtimeSeconds: 1_800,
    workLines: [
      { ...workBase, kind: 'hourly_regular', seconds: 3_600, amountMinorUnits: 10_000 },
      { ...workBase, kind: 'hourly_overtime', seconds: 1_800, amountMinorUnits: 5_000 },
    ],
    adjustmentLines: [
      {
        sourceId: '=HYPERLINK("https://example.invalid","bad")',
        sourceCalendarMonth: '2026-11',
        sourceKind: 'bonus',
        sourceCurrency: 'TRY',
        sourceAmountMinorUnits: 1_000,
        sourceNote: ' \t=1+1\nPotential note with "quotes"',
        sourceCreatedAt: '2026-11-10T09:00:00.000Z',
        earlierPeriodKey: '2026-10',
        laterPeriodKey: '2026-11',
        earlierMinorUnits: 500,
        laterMinorUnits: 500,
        selectedMinorUnits: 500,
        attributionRevision: 2,
        attributionReason: '@SUM(1,2)',
        attributionRecordedAt: '2026-11-16T08:00:00.000Z',
      },
    ],
    scope: 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
  };
}

function fixedExcluded() {
  return {
    ...hourly(),
    model: 'monthly_fixed',
    profiles: [{ id: 'pay_oct', revision: 2 }],
    baseRevision: 3,
    overtimeConsentRevision: 2,
    overtimeDecision: 'exclude_logged_overtime',
    fixedBaseMinorUnits: 3_200_000,
    regularWorkMinorUnits: 0,
    overtimeMinorUnits: 0,
    earningsMinorUnits: 3_200_000,
    adjustmentMinorUnits: 500,
    totalMinorUnits: 3_200_500,
    loggedSeconds: 0,
    overtimeSeconds: 0,
    workLines: [],
  };
}

test('versioned JSON captures exact signed minor units, source IDs, audit revisions and warnings', () => {
  const data = createCustomPayCombinedExport(hourly(), 'json');
  assert.equal(data.name, 'vardiyum-custom-estimate-26-2026-10.json');
  assert.equal(data.mimeType, 'application/json');
  const parsed = JSON.parse(data.content);
  assert.equal(parsed.schema, 'vardiyum-custom-pay-estimate-v1');
  assert.equal(parsed.period.startDate, '2026-10-26');
  assert.equal(parsed.period.endDateInclusive, '2026-11-25');
  assert.equal(parsed.period.scheduleTimeZone, 'Europe/Istanbul');
  assert.equal(parsed.totals.totalMinorUnits, 15500);
  assert.equal(parsed.totals.adjustmentMinorUnits, 500);
  assert.equal(parsed.workSources[0].sourceStartUtc, workBase.sourceStartUtc);
  assert.equal(parsed.workSources[1].rateBreakAuditRevision, 2);
  assert.equal(parsed.adjustmentSources[0].sourceAmountMinorUnits, 1000);
  assert.equal(parsed.adjustmentSources[0].attributionRevision, 2);
  assert.match(parsed.warning, /DO_NOT_ADD_TO_CALENDAR_MONTH_REPORT/);
  assert.equal(parsed.disclaimer, 'USER_REPORTED_PRE_TAX_ESTIMATE');
});

test('CSV quotes every text field and neutralizes formulas, controls and embedded quotes', () => {
  const csv = createCustomPayCombinedExport(hourly(), 'csv');
  assert.equal(csv.mimeType, 'text/csv');
  assert.equal(csv.name, 'vardiyum-custom-estimate-26-2026-10.csv');
  assert.match(csv.content, /"'\=HYPERLINK\(/);
  assert.match(csv.content, /"'\s+=1\+1 Potential note with ""quotes"""/);
  assert.match(csv.content, /"'@SUM\(1,2\)"/);
  assert.match(csv.content, /"ADJUSTMENT"/);
  assert.match(csv.content, /"TOTAL"/);
  assert.match(csv.content, /"15500"/);
  assert.match(csv.content, /"2026-11-10T05:00:00.000Z"/);
  assert.match(csv.content, /"DO_NOT_ADD_TO_CALENDAR_MONTH_REPORT/);
  assert.equal(csv.content.trimEnd().split('\n').length, 5); // header, 2 work, adjustment, total
});

test('fixed monthly consent EXCLUDE is exported as explicit base only, never double pay work', () => {
  const file = JSON.parse(createCustomPayCombinedExport(fixedExcluded(), 'json').content);
  assert.equal(file.model, 'monthly_fixed');
  assert.deepEqual(file.fixedBase, { revision: 3, minorUnits: 3200000 });
  assert.deepEqual(file.overtimeConsent, {
    revision: 2,
    decision: 'exclude_logged_overtime',
  });
  assert.equal(file.workSources.length, 0);
  const csv = createCustomPayCombinedExport(fixedExcluded(), 'csv').content;
  assert.match(csv, /"BASE"/);
  assert.match(csv, /"3200000"/);
  assert.match(csv, /"3200500"/);
});

test('new coherent data that matches reviewed report is exportable; changed audit needs fresh consent', () => {
  const displayed = hourly();
  const freshlyRead = structuredClone(displayed);
  assert.deepEqual(requireUnchangedCustomPayEstimate(displayed, freshlyRead), freshlyRead);
  freshlyRead.adjustmentLines[0].attributionRevision = 3;
  assert.throws(
    () => requireUnchangedCustomPayEstimate(displayed, freshlyRead),
    /CUSTOM_PAY_EXPORT_SOURCES_CHANGED_REVIEW_REQUIRED/,
  );
  const modifiedProfile = structuredClone(displayed);
  modifiedProfile.profiles[0].revision = 2;
  modifiedProfile.workLines.forEach((x) => { x.profileRevision = 2; });
  assert.throws(
    () => requireUnchangedCustomPayEstimate(displayed, modifiedProfile),
    /CUSTOM_PAY_EXPORT_SOURCES_CHANGED_REVIEW_REQUIRED/,
  );
});

test('blocked/disabled, day=1 legacy, wrong scope and invalid output formats fail closed', () => {
  const original = hourly();
  for (const invalid of [
    { status: 'blocked', periodKey: '2026-10', startDay: 26, reasons: ['STALE'] },
    { status: 'disabled', periodKey: '2026-10', startDay: 1 },
    { ...original, startDay: 1 },
    { ...original, scope: 'LEGAL_PAYSLIP' },
    { ...original, disclaimer: 'OFFICIAL_PAY' },
    { ...original, periodKey: '2026-13' },
    { ...original, scheduleTimeZone: '' },
  ]) {
    assert.throws(
      () => createCustomPayCombinedExport(invalid, 'json'),
      /CUSTOM_PAY_EXPORT_INVALID_OR_STALE_ESTIMATE/,
    );
  }
  assert.throws(
    () => createCustomPayCombinedExport(original, 'pdf'),
    /INVALID_CUSTOM_PAY_EXPORT_FORMAT/,
  );
});

test('financial inconsistencies, duplicate source IDs and foreign FX cannot leave the app', () => {
  const original = hourly();
  for (const invalid of [
    { ...original, totalMinorUnits: 15_501 },
    { ...original, totalMinorUnits: -1 },
    { ...original, overtimeMinorUnits: Number.MAX_SAFE_INTEGER },
    { ...original, adjustmentMinorUnits: -500 },
    { ...original, currency: 'JPY' },
    { ...original, workLines: [original.workLines[0], original.workLines[0]] },
    { ...original, workLines: [{ ...original.workLines[0], profileRevision: 3 }, original.workLines[1]] },
    { ...original, adjustmentLines: original.adjustmentLines.map((x) => ({ ...x, sourceCurrency: 'EUR' })) },
    { ...original, adjustmentLines: original.adjustmentLines.map((x) => ({ ...x, earlierMinorUnits: 700 })) },
    { ...original, adjustmentLines: [original.adjustmentLines[0], original.adjustmentLines[0]] },
    { ...original, adjustmentLines: original.adjustmentLines.map((x) => ({ ...x, selectedMinorUnits: 501 })) },
  ]) {
    assert.throws(
      () => createCustomPayCombinedExport(invalid, 'csv'),
      /CUSTOM_PAY_EXPORT_INVALID_OR_STALE_ESTIMATE/,
    );
  }
});

test('export path is pure and leaves its entire in-memory source untouched', () => {
  const snapshot = hourly();
  const before = JSON.stringify(snapshot);
  createCustomPayCombinedExport(snapshot, 'json');
  createCustomPayCombinedExport(snapshot, 'csv');
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(requireUnchangedCustomPayEstimate(snapshot, snapshot), snapshot);
});
