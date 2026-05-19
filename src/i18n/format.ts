import { SITE_LOCALE, STUDIO_LOCATION } from '@/consts';

export function formatDate(
  value: Date | string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(SITE_LOCALE, opts).format(date);
}

export function formatTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(SITE_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: STUDIO_LOCATION.timezone,
    timeZoneName: 'short',
  }).format(date);
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(SITE_LOCALE, opts).format(value);
}

export function formatList(
  values: readonly string[],
  type: Intl.ListFormatType = 'conjunction',
): string {
  return new Intl.ListFormat(SITE_LOCALE, { style: 'long', type }).format(values);
}

export function isoDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat(SITE_LOCALE, { numeric: 'auto' });

export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const then = typeof value === 'string' ? new Date(value) : value;
  const diffMs = then.getTime() - now.getTime();
  const days = Math.round(diffMs / 86_400_000);
  if (Number.isNaN(days)) return '';
  const abs = Math.abs(days);
  if (abs < 30) return RELATIVE_FORMAT.format(days, 'day');
  if (abs < 365) return RELATIVE_FORMAT.format(Math.round(days / 30), 'month');
  return RELATIVE_FORMAT.format(Math.round(days / 365), 'year');
}
