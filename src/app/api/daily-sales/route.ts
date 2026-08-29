import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const rows = await executeQuery(
      'SELECT * FROM daily_sales ORDER BY sale_date DESC LIMIT 366'
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily sales' },
      { status: 500 }
    );
  }
}
