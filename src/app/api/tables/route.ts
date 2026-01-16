import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all tables with occupancy status (including inactive ones)
    const rows = await executeQuery(`
      SELECT
        t.id,
        t.table_code,
        t.table_name,
        t.capacity,
        t.is_active,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM orders o
            WHERE o.table_id = t.id
            AND o.order_type = 'DINE_IN'
            AND o.status NOT IN ('served', 'cancelled')
          ) THEN 1
          ELSE 0
        END as is_occupied
      FROM tables_master t
      ORDER BY
        CASE
          WHEN t.table_code REGEXP '^[0-9]+$' THEN CAST(t.table_code AS UNSIGNED)
          WHEN t.table_code REGEXP '^[A-Za-z]+[0-9]+$' THEN CAST(SUBSTRING(t.table_code, 2) AS UNSIGNED)
          ELSE CAST(t.table_code AS UNSIGNED)
        END,
        t.table_code
    `) as any[];

    // Convert is_occupied to boolean
    const tables = rows.map(row => ({
      ...row,
      is_occupied: Boolean(row.is_occupied)
    }));

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

    // Validation
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

    // Check if table_code already exists
    const existingTable = await executeQuery(
      'SELECT id FROM tables_master WHERE table_code = ? AND is_active = 1',
      [table_code]
    ) as any[];

    if (existingTable.length > 0) {
      return NextResponse.json(
        { error: 'Table code already exists' },
        { status: 400 }
      );
    }

    // Insert new table
    const result = await executeQuery(
      'INSERT INTO tables_master (table_code, table_name, capacity, is_active, created_at) VALUES (?, ?, ?, 1, NOW())',
      [table_code, table_name, capacity]
    ) as any;

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


