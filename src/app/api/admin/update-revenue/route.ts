import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSqlDayRange } from '@/lib/date-range';

export async function POST(request: NextRequest) {
  try {
    const { date, revenue } = await request.json();

    if (!date || !revenue) {
      return NextResponse.json(
        { error: 'Date and revenue are required' },
        { status: 400 }
      );
    }

    // First, let's see current revenue for the date
    const { start, end } = getSqlDayRange(date);

    const currentRows = await executeQuery(
      `SELECT
        DATE_FORMAT(order_time, '%Y-%m-%d') as date,
        SUM(total) as current_revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE order_time >= ? AND order_time < ? AND payment_status = 'paid'`,
      [start, end]
    ) as any[];

    const currentRevenue = currentRows.length > 0 ? currentRows[0].current_revenue : 0;
    const orderCount = currentRows.length > 0 ? currentRows[0].order_count : 0;

    // Insert or update the manual revenue
    await executeQuery(`
      INSERT INTO revenue_overrides (date, manual_revenue, original_revenue)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        manual_revenue = VALUES(manual_revenue),
        updated_at = CURRENT_TIMESTAMP
    `, [date, revenue, currentRevenue]);

    return NextResponse.json({
      success: true,
      message: `Manual revenue for ${date} updated to ₹${revenue}`,
      data: {
        date,
        manual_revenue: revenue,
        original_revenue: currentRevenue,
        order_count: orderCount
      }
    });

  } catch (error) {
    console.error('Error updating revenue:', error);
    return NextResponse.json(
      { error: 'Failed to update revenue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get manual override for the date
    const overrides = await executeQuery(
      `SELECT date, manual_revenue, original_revenue, created_at, updated_at
       FROM revenue_overrides
       WHERE date = ?`,
      [date]
    ) as any[];

    if (overrides.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No manual override found for this date'
      });
    }

    return NextResponse.json({
      success: true,
      data: overrides[0]
    });

  } catch (error) {
    console.error('Error fetching revenue override:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue override', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
