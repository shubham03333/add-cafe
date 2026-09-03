import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache } from '@/lib/cache';
import { ensureQrSessionSchema } from '@/lib/qr-table-session';

const TABLES_CACHE_KEY = 'tables_occupancy';

export async function GET() {
  try {
    await ensureQrSessionSchema();
    const cached = cache.get(TABLES_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rows = await executeQuery(`
      SELECT
        t.id,
        t.table_code,
        t.table_name,
        t.capacity,
        t.is_active,
        CASE WHEN occ.table_id IS NOT NULL THEN 1 ELSE 0 END as is_occupied,
        CASE WHEN qr.table_id IS NOT NULL THEN 1 ELSE 0 END as qr_session_open
      FROM tables_master t
      LEFT JOIN (
        SELECT DISTINCT table_id
        FROM orders
        WHERE order_type = 'DINE_IN'
          AND status NOT IN ('served', 'cancelled')
          AND table_id IS NOT NULL
      ) occ ON occ.table_id = t.id
      LEFT JOIN (
        SELECT DISTINCT table_id
        FROM table_qr_sessions
        WHERE closed_at IS NULL
          AND expires_at > NOW()
      ) qr ON qr.table_id = t.id
      ORDER BY
        CASE
          WHEN t.table_code REGEXP '^[0-9]+$' THEN CAST(t.table_code AS UNSIGNED)
          WHEN t.table_code REGEXP '^[A-Za-z]+[0-9]+$' THEN CAST(SUBSTRING(t.table_code, 2) AS UNSIGNED)
          ELSE CAST(t.table_code AS UNSIGNED)
        END,
        t.table_code
    `) as any[];

    const tables = (rows || []).map(row => ({
      ...row,
      is_occupied: Boolean(row.is_occupied),
      qr_session_open: Boolean(row.qr_session_open)
    }));

    cache.set(TABLES_CACHE_KEY, tables, 5);
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { table_code, table_name, capacity } = await request.json();

    if (!table_code || !table_name || !capacity) {
      return NextResponse.json(
        { error: 'table_code, table_name, and capacity are required' },
        { status: 400 }
      );
    }

    if (capacity < 1 || capacity > 20) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 20' },
        { status: 400 }
      );
    }

    const existingTable = await executeQuery(
      'SELECT id FROM tables_master WHERE table_code = ? AND is_active = 1 LIMIT 1',
      [table_code]
    ) as any[];

    if (existingTable.length > 0) {
      return NextResponse.json(
        { error: 'Table code already exists' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      'INSERT INTO tables_master (table_code, table_name, capacity, is_active, created_at) VALUES (?, ?, ?, 1, NOW())',
      [table_code, table_name, capacity]
    ) as any;

    cache.delete(TABLES_CACHE_KEY);

    return NextResponse.json({
      id: result.insertId,
      table_code,
      table_name,
      capacity,
      is_active: true,
      message: 'Table added successfully'
    });
  } catch (error) {
    console.error('Error adding table:', error);
    return NextResponse.json(
      { error: 'Failed to add table' },
      { status: 500 }
    );
  }
}
