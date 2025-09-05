import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all order dates to see what's in the database
    const allOrders = await executeQuery(
      `SELECT
        DATE_FORMAT(order_time, '%Y-%m-%d') as order_date,
        COUNT(*) as order_count,
        SUM(total) as total_revenue
       FROM orders
       GROUP BY DATE_FORMAT(order_time, '%Y-%m-%d')
       ORDER BY order_date DESC
       LIMIT 10`
    ) as any[];

    // Check for manual overrides
    const overrides = await executeQuery(
      `SELECT date, manual_revenue, original_revenue
       FROM revenue_overrides
       ORDER BY date DESC
       LIMIT 10`
    ) as any[];

    // Check orders for specific date
    const specificDateOrders = await executeQuery(
      `SELECT
        id,
        order_number,
        total,
        payment_status,
        DATE_FORMAT(order_time, '%Y-%m-%d %H:%i:%s') as formatted_time
       FROM orders
       WHERE DATE(order_time) = '2025-04-09'
       ORDER BY order_time DESC`
    ) as any[];

    return NextResponse.json({
      recent_order_dates: allOrders,
      manual_overrides: overrides,
      orders_for_2025_04_09: specificDateOrders
    });
  } catch (error) {
    console.error('Error debugging orders:', error);
    return NextResponse.json(
      { error: 'Failed to debug orders' },
      { status: 500 }
    );
  }
}
