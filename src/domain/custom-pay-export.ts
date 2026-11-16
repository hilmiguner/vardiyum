import type { CustomPayCombinedEstimate } from './custom-pay-combined.ts';
import type { EarningsExportFormat } from './earnings-export.ts';

type VerifiedEstimate = Extract<CustomPayCombinedEstimate, { status: 'estimated' }>;
type ExportFile = { name: string; mimeType: string; content: string };

const MAX_MINOR = 1_000_000_000_000n;
const MAX_EXPORT_CHARS = 2_000_000;
const DISCLAIMER = 'USER_REPORTED_PRE_TAX_ESTIMATE';
const NON_ADDITIVE = 'DO_NOT_ADD_TO_CALENDAR_MONTH_REPORT_NOT_AN_OFFICIAL_PAYSLIP';

function fail(): never {
  throw new Error('CUSTOM_PAY_EXPORT_INVALID_OR_STALE_ESTIMATE');
}

function minor(value: number): bigint {
  if (!Number.isSafeInteger(value) || BigInt(Math.abs(value)) > MAX_MINOR) fail();
  return BigInt(value);
}

function sum(values: readonly number[]): bigint {
  return values.reduce((acc, value) => acc + minor(value), 0n);
}

function csvCell(input: string | number | null): string {
  // Exact signed numeric cells remain numeric; only strings need neutralization.
  if (typeof input === 'number') {
    if (!Number.isSafeInteger(input)) fail();
    return String(input);
  }
  // Quotes cannot protect spreadsheet imports from leading formula characters.
  // Normalize embedded controls and neutralize dangerous prefixes in ALL text fields.
  const value = String(input ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ');
  const neutral = /^[\s\uFEFF\u200B]*[=+\-@]/u.test(value) ? "'" + value : value;
  return '"' + neutral.replace(/"/g, '""') + '"';
}

function validate(report: CustomPayCombinedEstimate): asserts report is VerifiedEstimate {
  if (
    report.status !== 'estimated' ||
    report.scope !== 'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE' ||
    report.disclaimer !== DISCLAIMER ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(report.periodKey) ||
    !Number.isInteger(report.startDay) ||
    report.startDay < 2 ||
    report.startDay > 28 ||
    report.startDate !== report.periodKey + '-' + String(report.startDay).padStart(2, '0') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(report.endDateInclusive) ||
    report.startDate >= report.endDateInclusive ||
    !report.scheduleTimeZone ||
    !/^(TRY|USD|EUR|GBP)$/.test(report.currency) ||
    !['hourly_actual_work', 'monthly_fixed'].includes(report.model) ||
    !Array.isArray(report.profiles) ||
    report.profiles.length < 1 ||
    report.profiles.length > 2 ||
    !Array.isArray(report.workLines) ||
    !Array.isArray(report.adjustmentLines)
  )
    fail();

  const profiles = new Set<string>();
  for (const profile of report.profiles) {
    if (
      !profile.id ||
      !Number.isSafeInteger(profile.revision) ||
      profile.revision < 1 ||
      profiles.has(profile.id + ':' + profile.revision)
    )
      fail();
    profiles.add(profile.id + ':' + profile.revision);
  }

  const fixed = report.model === 'monthly_fixed';
  if (
    (fixed &&
      (report.profiles.length !== 1 ||
        (report.baseRevision === null ||
          !Number.isSafeInteger(report.baseRevision) ||
          report.baseRevision < 1) ||
        (report.overtimeConsentRevision === null ||
          !Number.isSafeInteger(report.overtimeConsentRevision) ||
          report.overtimeConsentRevision < 1) ||
        !['include_logged_overtime', 'exclude_logged_overtime'].includes(
          report.overtimeDecision,
        ) ||
        report.regularWorkMinorUnits !== 0)) ||
    (!fixed &&
      (report.fixedBaseMinorUnits !== 0 ||
        report.baseRevision !== null ||
        report.overtimeConsentRevision !== null ||
        report.overtimeDecision !== 'not_applicable'))
  )
    fail();

  const seenWork = new Set<string>();
  let workSeconds = 0;
  let overtimeSeconds = 0;
  const regularAmounts: number[] = [];
  const overtimeAmounts: number[] = [];
  for (const line of report.workLines) {
    const key = [
      line.workId,
      line.kind,
      line.profileId,
      line.profileRevision,
      line.segmentStartUtc,
      line.segmentEndUtc,
    ].join('|');
    if (
      !line.workId ||
      seenWork.has(key) ||
      !profiles.has(line.profileId + ':' + line.profileRevision) ||
      !line.timeZone ||
      !/^\d{4}-\d{2}-\d{2}T/.test(line.sourceStartUtc) ||
      line.sourceStartUtc > line.segmentStartUtc ||
      line.segmentStartUtc >= line.segmentEndUtc ||
      line.segmentEndUtc > line.sourceEndUtc ||
      !Number.isSafeInteger(line.seconds) ||
      line.seconds < 0 ||
      minor(line.amountMinorUnits) < 0n ||
      (fixed && line.kind !== 'fixed_overtime') ||
      (!fixed && !['hourly_regular', 'hourly_overtime'].includes(line.kind)) ||
      (line.breakAuditRevision !== null &&
        (!Number.isSafeInteger(line.breakAuditRevision) || line.breakAuditRevision < 1)) ||
      (line.rateBreakAuditRevision !== null &&
        (!Number.isSafeInteger(line.rateBreakAuditRevision) ||
          line.rateBreakAuditRevision < 1)) ||
      (line.rateBreakAuditKind !== null && !['rate', 'dual'].includes(line.rateBreakAuditKind))
    )
      fail();
    seenWork.add(key);
    if (line.kind === 'hourly_regular') regularAmounts.push(line.amountMinorUnits);
    else overtimeAmounts.push(line.amountMinorUnits);
    if (line.kind !== 'fixed_overtime') workSeconds += line.seconds;
    if (line.kind === 'hourly_overtime' || line.kind === 'fixed_overtime')
      overtimeSeconds += line.seconds;
  }

  const seenAdjustment = new Set<string>();
  for (const line of report.adjustmentLines) {
    if (
      !line.sourceId ||
      seenAdjustment.has(line.sourceId) ||
      line.sourceCurrency !== report.currency ||
      !['bonus', 'deduction', 'correction'].includes(line.sourceKind) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(line.sourceCalendarMonth) ||
      !line.sourceCreatedAt ||
      !line.attributionRecordedAt ||
      !line.attributionReason ||
      !Number.isSafeInteger(line.attributionRevision) ||
      line.attributionRevision < 1 ||
      (line.earlierPeriodKey !== report.periodKey &&
        line.laterPeriodKey !== report.periodKey) ||
      minor(line.earlierMinorUnits) + minor(line.laterMinorUnits) !==
        minor(line.sourceAmountMinorUnits) ||
      minor(line.selectedMinorUnits) !==
        minor(
          line.earlierPeriodKey === report.periodKey
            ? line.earlierMinorUnits
            : line.laterMinorUnits,
        )
    )
      fail();
    seenAdjustment.add(line.sourceId);
  }

  const expectedEarnings = sum([
    report.fixedBaseMinorUnits,
    report.regularWorkMinorUnits,
    report.overtimeMinorUnits,
  ]);
  if (
    sum(regularAmounts) !== minor(report.regularWorkMinorUnits) ||
    sum(overtimeAmounts) !== minor(report.overtimeMinorUnits) ||
    sum(report.adjustmentLines.map((line) => line.selectedMinorUnits)) !==
      minor(report.adjustmentMinorUnits) ||
    expectedEarnings !== minor(report.earningsMinorUnits) ||
    expectedEarnings + minor(report.adjustmentMinorUnits) !== minor(report.totalMinorUnits) ||
    report.totalMinorUnits < 0 ||
    !Number.isSafeInteger(report.loggedSeconds) ||
    !Number.isSafeInteger(report.overtimeSeconds) ||
    report.overtimeSeconds < 0 ||
    report.loggedSeconds < report.overtimeSeconds ||
    (!fixed &&
      (workSeconds !== report.loggedSeconds || overtimeSeconds !== report.overtimeSeconds)) ||
    (fixed &&
      report.overtimeDecision === 'exclude_logged_overtime' &&
      (report.overtimeMinorUnits !== 0 ||
        report.overtimeSeconds !== 0 ||
        report.loggedSeconds !== 0 ||
        report.workLines.length !== 0)) ||
    (fixed &&
      report.overtimeDecision === 'include_logged_overtime' &&
      overtimeSeconds !== report.overtimeSeconds)
  )
    fail();
}

/** A confirmation becomes invalid if ANY previously displayed source or audit changes. */
export function requireUnchangedCustomPayEstimate(
  reviewed: CustomPayCombinedEstimate,
  fresh: CustomPayCombinedEstimate,
): VerifiedEstimate {
  validate(reviewed);
  validate(fresh);
  if (JSON.stringify(reviewed) !== JSON.stringify(fresh))
    throw new Error('CUSTOM_PAY_EXPORT_SOURCES_CHANGED_REVIEW_REQUIRED');
  return fresh;
}

/**
 * Serialization never opens files, shares, logs, persists or transmits financial data.
 * Caller must obtain a new source-coherent SQLite read and explicit consent first.
 */
export function createCustomPayCombinedExport(
  report: CustomPayCombinedEstimate,
  format: EarningsExportFormat,
): ExportFile {
  validate(report);
  if (format !== 'csv' && format !== 'json')
    throw new Error('INVALID_CUSTOM_PAY_EXPORT_FORMAT');
  const fileStem = 'vardiyum-custom-estimate-' + report.startDay + '-' + report.periodKey;
  const snapshot = {
    schema: 'vardiyum-custom-pay-estimate-v1',
    scope: report.scope,
    disclaimer: DISCLAIMER,
    warning: NON_ADDITIVE,
    period: {
      periodKey: report.periodKey,
      startDay: report.startDay,
      startDate: report.startDate,
      endDateInclusive: report.endDateInclusive,
      scheduleTimeZone: report.scheduleTimeZone,
    },
    model: report.model,
    currency: report.currency,
    profiles: report.profiles,
    fixedBase: {
      revision: report.baseRevision,
      minorUnits: report.fixedBaseMinorUnits,
    },
    overtimeConsent: {
      revision: report.overtimeConsentRevision,
      decision: report.overtimeDecision,
    },
    totals: {
      fixedBaseMinorUnits: report.fixedBaseMinorUnits,
      regularWorkMinorUnits: report.regularWorkMinorUnits,
      overtimeMinorUnits: report.overtimeMinorUnits,
      earningsMinorUnits: report.earningsMinorUnits,
      adjustmentMinorUnits: report.adjustmentMinorUnits,
      totalMinorUnits: report.totalMinorUnits,
      loggedSeconds: report.loggedSeconds,
      overtimeSeconds: report.overtimeSeconds,
    },
    workSources: report.workLines,
    adjustmentSources: report.adjustmentLines,
  };
  if (format === 'json') {
    const content = JSON.stringify(snapshot, null, 2) + '\n';
    if (content.length > MAX_EXPORT_CHARS) fail();
    return { name: fileStem + '.json', mimeType: 'application/json', content };
  }

  const headers = [
    'rowType',
    'periodKey',
    'startDay',
    'startDate',
    'endDateInclusive',
    'scheduleTimeZone',
    'currency',
    'kind',
    'sourceId',
    'profileId',
    'profileRevision',
    'sourceStartUtc',
    'sourceEndUtc',
    'segmentStartUtc',
    'segmentEndUtc',
    'seconds',
    'amountMinorUnits',
    'breakAuditRevision',
    'rateBreakAuditKind',
    'rateBreakAuditRevision',
    'attributionRevision',
    'sourceCalendarMonth',
    'originalMinorUnits',
    'earlierPeriodKey',
    'earlierMinorUnits',
    'laterPeriodKey',
    'laterMinorUnits',
    'sourceNote',
    'auditReason',
    'recordedAt',
    'baseRevision',
    'overtimeConsentRevision',
    'overtimeDecision',
    'disclaimer',
  ];
  const rows: (string | number | null)[][] = [];
  const common = [
    report.periodKey,
    report.startDay,
    report.startDate,
    report.endDateInclusive,
    report.scheduleTimeZone,
    report.currency,
  ];
  const push = (
    type: string,
    kind: string,
    sourceId: string,
    amount: number,
    extra: Partial<Record<number, string | number | null>> = {},
  ) => {
    const row: (string | number | null)[] = Array(headers.length).fill('');
    row.splice(0, 7, type, ...common);
    row[7] = kind;
    row[8] = sourceId;
    row[16] = amount;
    row[30] = report.baseRevision;
    row[31] = report.overtimeConsentRevision;
    row[32] = report.overtimeDecision;
    row[33] = DISCLAIMER + '; ' + NON_ADDITIVE;
    for (const [index, value] of Object.entries(extra)) row[Number(index)] = value ?? null;
    rows.push(row);
  };
  if (report.model === 'monthly_fixed')
    push('BASE', 'monthly_fixed_base', '', report.fixedBaseMinorUnits);
  for (const line of report.workLines) {
    push('WORK', line.kind, line.workId, line.amountMinorUnits, {
      9: line.profileId,
      10: line.profileRevision,
      11: line.sourceStartUtc,
      12: line.sourceEndUtc,
      13: line.segmentStartUtc,
      14: line.segmentEndUtc,
      15: line.seconds,
      17: line.breakAuditRevision,
      18: line.rateBreakAuditKind,
      19: line.rateBreakAuditRevision,
    });
  }
  for (const line of report.adjustmentLines) {
    push('ADJUSTMENT', line.sourceKind, line.sourceId, line.selectedMinorUnits, {
      20: line.attributionRevision,
      21: line.sourceCalendarMonth,
      22: line.sourceAmountMinorUnits,
      23: line.earlierPeriodKey,
      24: line.earlierMinorUnits,
      25: line.laterPeriodKey,
      26: line.laterMinorUnits,
      27: line.sourceNote,
      28: line.attributionReason,
      29: line.attributionRecordedAt,
    });
  }
  push('TOTAL', 'COMBINED_PRE_TAX_ESTIMATE', '', report.totalMinorUnits);
  const content =
    headers.join(',') + '\n' + rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
  if (content.length > MAX_EXPORT_CHARS) fail();
  return { name: fileStem + '.csv', mimeType: 'text/csv', content };
}
