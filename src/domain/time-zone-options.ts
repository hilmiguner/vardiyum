/**
 * Human-readable IANA choices for users who do not know technical time-zone IDs.
 * Device/current zones appear even when the engine's supportedValuesOf list is absent.
 */
const POPULAR = [
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Australia/Sydney',
  'UTC',
] as const;

const LABELS: Readonly<Record<string, readonly [string, string]>> = {
  'Europe/Istanbul': ['Türkiye · İstanbul', 'Turkey · Istanbul'],
  'Europe/London': ['Birleşik Krallık · Londra', 'United Kingdom · London'],
  'Europe/Berlin': ['Almanya · Berlin', 'Germany · Berlin'],
  'Europe/Paris': ['Fransa · Paris', 'France · Paris'],
  'America/New_York': ['ABD · New York', 'United States · New York'],
  'America/Chicago': ['ABD · Chicago', 'United States · Chicago'],
  'America/Los_Angeles': ['ABD · Los Angeles', 'United States · Los Angeles'],
  'Asia/Dubai': ['BAE · Dubai', 'UAE · Dubai'],
  'Asia/Tokyo': ['Japonya · Tokyo', 'Japan · Tokyo'],
  'Asia/Kolkata': ['Hindistan · Kalküta', 'India · Kolkata'],
  'Asia/Kathmandu': ['Nepal · Katmandu', 'Nepal · Kathmandu'],
  'Australia/Sydney': ['Avustralya · Sidney', 'Australia · Sydney'],
  UTC: ['UTC · Evrensel zaman', 'UTC · Universal time'],
};

export function humanTimeZoneLabel(zone: string, locale: 'tr' | 'en'): string {
  const localized = LABELS[zone];
  if (localized) return localized[locale === 'tr' ? 0 : 1];
  return zone.replaceAll('_', ' ').replaceAll('/', ' · ');
}

export function timeZoneChoices(current: string, device: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const values = [current, device, ...POPULAR, ...supported];
  return [...new Set(values)].filter((zone) => {
    if (!zone) return false;
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  });
}

export function filterTimeZoneChoices(
  zones: readonly string[],
  query: string,
  locale: 'tr' | 'en',
): string[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  if (!needle) return [...zones];
  return zones.filter((zone) =>
    (humanTimeZoneLabel(zone, locale) + ' ' + zone.replaceAll('_', ' '))
      .toLocaleLowerCase(locale)
      .includes(needle),
  );
}
