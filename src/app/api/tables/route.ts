import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const rows = await executeQuery(
      'SELECT id, table_code, table_name, capacity, is_active FROM tables_master WHERE is_active = 1 ORDER BY table_code'
    ) as any[];

    return NextResponse.json(rows);
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


