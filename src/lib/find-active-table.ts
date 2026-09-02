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

  const exact = sqlRows(await executeQuery(
    'SELECT id FROM tables_master WHERE table_code = ? AND is_active = 1 LIMIT 1',
    [wanted]
  ));
  if (exact[0]?.id) return Number(exact[0].id);

  const rows = sqlRows(await executeQuery(
    'SELECT id, table_code FROM tables_master WHERE is_active = 1'
  ));
  const wantedLower = wanted.toLowerCase();
  const wantedNum = tableNumber(wanted);

  for (const row of rows) {
    const code = String(row.table_code || '').trim();
    if (code.toLowerCase() === wantedLower) return Number(row.id);
    if (wantedNum != null && tableNumber(code) === wantedNum) return Number(row.id);
  }

  return null;
}
