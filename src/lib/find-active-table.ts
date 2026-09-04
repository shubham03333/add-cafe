import { executeQuery } from '@/lib/db';
import { sqlRows } from '@/lib/sql-rows';

function tableNumber(code: string) {
  const digits = String(code).trim().replace(/^[A-Za-z]+/, '');
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

export async function findActiveTableId(tableCode: string): Promise<number | null> {
  const wanted = String(tableCode || '').trim();
  if (!wanted) return null;

  const wantedNum = tableNumber(wanted);
  const padded = wantedNum != null ? `T${String(wantedNum).padStart(2, '0')}` : null;
  const codes = [...new Set([wanted, padded].filter(Boolean))] as string[];
  const placeholders = codes.map(() => '?').join(',');

  const matches = sqlRows(await executeQuery(
    `SELECT id, table_code FROM tables_master
     WHERE is_active = 1 AND table_code IN (${placeholders})
     LIMIT 8`,
    codes
  ));
  const exact = matches.find((row) => String(row.table_code || '').trim() === wanted);
  if (exact?.id) return Number(exact.id);
  if (padded) {
    const paddedMatch = matches.find((row) => String(row.table_code || '').trim() === padded);
    if (paddedMatch?.id) return Number(paddedMatch.id);
  }

  const rows = sqlRows(await executeQuery(
    'SELECT id, table_code FROM tables_master WHERE is_active = 1'
  ));
  const wantedLower = wanted.toLowerCase();

  for (const row of rows) {
    const code = String(row.table_code || '').trim();
    if (code.toLowerCase() === wantedLower) return Number(row.id);
    if (wantedNum != null && tableNumber(code) === wantedNum) return Number(row.id);
  }

  return null;
}
