export type SqlRow = Record<string, unknown>;

export function sqlRows(value: unknown): SqlRow[] {
  return Array.isArray(value) ? (value as SqlRow[]) : [];
}
