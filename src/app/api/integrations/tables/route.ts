import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache } from '@/lib/cache';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { sqlRows } from '@/lib/sql-rows';

const CACHE_KEY = 'integration_tables';

export async function GET(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return integrationJson(request, cached);

    const rows = sqlRows(await executeQuery(`
      SELECT
        t.id,
        t.table_code,
        t.table_name,
        t.capacity,
        CASE WHEN occ.table_id IS NOT NULL THEN 1 ELSE 0 END as is_occupied
      FROM tables_master t
      LEFT JOIN (
        SELECT DISTINCT table_id
        FROM orders
        WHERE order_type = 'DINE_IN'
          AND status NOT IN ('served', 'cancelled')
          AND table_id IS NOT NULL
      ) occ ON occ.table_id = t.id
      WHERE t.is_active = 1
      ORDER BY
        CASE
          WHEN t.table_code REGEXP '^[0-9]+$' THEN CAST(t.table_code AS UNSIGNED)
          WHEN t.table_code REGEXP '^[A-Za-z]+[0-9]+$' THEN CAST(SUBSTRING(t.table_code, 2) AS UNSIGNED)
          ELSE CAST(t.table_code AS UNSIGNED)
        END,
        t.table_code
    `));

    const tables = (rows || []).map((row) => ({
      id: row.id,
      table_code: row.table_code,
      table_name: row.table_name,
      capacity: row.capacity,
      is_occupied: Boolean(row.is_occupied),
    }));

    const payload = { tables, synced_at: new Date().toISOString() };
    cache.set(CACHE_KEY, payload, 5);
    return integrationJson(request, payload);
  } catch (error) {
    console.error('[integration] tables GET failed', error);
    return integrationJson(request, { error: 'Failed to fetch tables' }, 500);
  }
}
