/**
 * UI text -> integer cents, never Number(decimalCurrency).
 * First release supports four two-decimal currencies only.
 */
export const SUPPORTED_EARNINGS_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;

export function parseMoneyMinor(input: string): number {
  const value = input.trim();
  const match = /^(-?)(0|[1-9][0-9]{0,9})(?:[.,]([0-9]{1,2}))?$/.exec(value);
  if (!match) throw new Error('INVALID_MONEY_TEXT');
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'));
  const signed = match[1] ? -cents : cents;
  if (signed > 1_000_000_000_000n || signed < -1_000_000_000_000n)
    throw new Error('MONEY_TEXT_TOO_LARGE');
  return Number(signed);
}

export function formatMoneyMinor(
  cents: number,
  currency: string,
  locale: 'tr' | 'en' = 'tr',
): string {
  if (!Number.isSafeInteger(cents)) throw new Error('INVALID_MONEY_AMOUNT');
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
  const fractional = String(abs % 100).padStart(2, '0');
  return sign + whole + (locale === 'tr' ? ',' : '.') + fractional + ' ' + currency;
}
