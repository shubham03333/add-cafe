/**
 * Inclusive local calendar-day bounds as DATETIME strings.
 * Equivalent to DATE(column) = dateStr when the session timezone matches stored timestamps,
 * but remains index-friendly (range scan on order_time).
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function getSqlDayRange(dateStr: string): { start: string; end: string } {
  return {
    start: `${dateStr} 00:00:00`,
    end: `${addDays(dateStr, 1)} 00:00:00`,
  };
}
