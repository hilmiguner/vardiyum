import type { EarningsReport } from './earnings-engine.ts';

export type EarningsExportFormat = 'json' | 'csv';

function safeCsvText(value: string): string {
  // User-provided adjustment notes must never become spreadsheet formulas.
  const safe = /^[\s]*[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

/** User-initiated, read-only export of the displayed, validated estimate only. */
export function createEarningsExport(
  report: EarningsReport,
  format: EarningsExportFormat,
): { name: string; mimeType: string; content: string } {
  if (report.status !== 'estimated') throw new Error('EARNINGS_NOT_EXPORTABLE');
  const { periodKey, profile, lines, totalMinorUnits, loggedSeconds,
    regularSeconds, overtimeSeconds, splitAcrossMonthsCount } = report;
  const snapshot = {
    schema: 'vardiyum-estimated-earnings-v1',
    disclaimer: 'USER_REPORTED_PRE_TAX_ESTIMATE',
    periodKey,
    currency: profile.currency,
    profile: {
      id: profile.id,
      revision: profile.revision,
      effectiveFrom: profile.effectiveFrom,
      model: profile.model,
      baseMinorUnits: profile.baseMinorUnits,
      overtimeHourlyMinorUnits: profile.overtimeHourlyMinorUnits,
      overtimeAfterMinutes: profile.overtimeAfterMinutes,
      overtimeMultiplierNumerator: profile.overtimeMultiplierNumerator,
      overtimeMultiplierDenominator: profile.overtimeMultiplierDenominator,
    },
    loggedSeconds,
    regularSeconds,
    overtimeSeconds,
    splitAcrossMonthsCount,
    lines: lines.map((line) => ({
      kind: line.kind,
      sourceId: line.sourceId,
      profileId: line.profileId,
      profileRevision: line.profileRevision,
      segmentStartUtc: line.segmentStartUtc ?? null,
      segmentEndUtc: line.segmentEndUtc ?? null,
      seconds: line.seconds,
      amountMinorUnits: line.amountMinorUnits,
      description: line.description,
    })),
    totalMinorUnits,
  };
  if (format === 'json') {
    return {
      name: 'vardiyum-estimate-' + periodKey + '.json',
      mimeType: 'application/json',
      content: JSON.stringify(snapshot, null, 2) + '\n',
    };
  }
  if (format !== 'csv') throw new Error('INVALID_EARNINGS_EXPORT_FORMAT');
  const columns = [
    'periodKey','currency','kind','sourceId','profileId',
    'profileRevision','segmentStartUtc','segmentEndUtc','seconds',
    'amountMinorUnits','description',
  ];
  const rows = lines.map((line) => [
    safeCsvText(periodKey),safeCsvText(profile.currency),safeCsvText(line.kind),
    safeCsvText(line.sourceId),safeCsvText(line.profileId),
    String(line.profileRevision),
    safeCsvText(line.segmentStartUtc ?? ''),safeCsvText(line.segmentEndUtc ?? ''),
    String(line.seconds),String(line.amountMinorUnits),safeCsvText(line.description),
  ].join(','));
  rows.push([
    safeCsvText(periodKey),safeCsvText(profile.currency),safeCsvText('TOTAL'),
    safeCsvText(''),safeCsvText(profile.id),String(profile.revision),
    safeCsvText(''),safeCsvText(''),'0',String(totalMinorUnits),
    safeCsvText('User-entered, pre-tax estimate; not an official payslip'),
  ].join(','));
  return {
    name: 'vardiyum-estimate-' + periodKey + '.csv',
    mimeType: 'text/csv',
    content: columns.join(',') + '\n' + rows.join('\n') + '\n',
  };
}
