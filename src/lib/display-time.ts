/**
 * TiDB TIMESTAMP values are UTC. Naive "YYYY-MM-DD HH:mm:ss" strings from SQL
 * DATE_FORMAT are also UTC unless the query already shifted them.
 */
export function parseDbUtc(value: string | Date | null | undefined): Date {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  const raw = String(value).trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00Z`);
  if (/^\d{4}$/.test(raw)) return new Date(`${raw}-01-01T00:00:00Z`);
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00Z`);
  return new Date(`${iso}Z`);
}

/** IST wall-clock from analytics after DATE_ADD(..., 330 MINUTE). */
export function parseIstWallClock(value: string): Date {
  const raw = String(value || '').trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00+05:30`);
  if (/^\d{4}$/.test(raw)) return new Date(`${raw}-01-01T00:00:00+05:30`);
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00+05:30`);
  return new Date(`${iso}+05:30`);
}

export function formatLocalDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  const date = parseDbUtc(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}
