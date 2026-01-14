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
