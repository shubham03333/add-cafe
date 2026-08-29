import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'hourly';
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10)));

    let groupBy: string;

    switch (period) {
      case 'daily':
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m-%d")';
        break;
      case 'weekly':
        groupBy = 'DATE_FORMAT(DATE_SUB(order_time, INTERVAL WEEKDAY(order_time) DAY), "%Y-%m-%d")';
        break;
      case 'monthly':
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m")';
        break;
      default:
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00")';
    }

    const rows = await executeQuery(
      `SELECT
        ${groupBy} as time_period,
        COUNT(*) as order_count,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value
       FROM orders
       WHERE order_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY ${groupBy}
       ORDER BY time_period DESC
       LIMIT 50`,
      [days]
    ) as any[];

    const total_orders = (rows || []).reduce((sum, row) => sum + Number(row.order_count || 0), 0);

    return NextResponse.json({
      success: true,
      data: rows || [],
      total_orders,
      period,
      days
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order analytics' },
      { status: 500 }
    );
  }
}
