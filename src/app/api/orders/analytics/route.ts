import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'hourly'; // hourly, daily, weekly, monthly
    const days = parseInt(searchParams.get('days') || '7');

    let groupBy: string;
    let dateFormat: string;
    let orderBy: string;

    switch (period) {
      case 'hourly':
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00")';
        dateFormat = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00")';
        orderBy = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00") DESC';
        break;
      case 'daily':
        groupBy = 'DATE(order_time)';
        dateFormat = 'DATE(order_time)';
        orderBy = 'DATE(order_time) DESC';
        break;
      case 'weekly':
        groupBy = 'DATE_FORMAT(DATE_SUB(order_time, INTERVAL (WEEKDAY(order_time)) DAY), "%Y-%m-%d")';
        dateFormat = 'DATE_FORMAT(DATE_SUB(order_time, INTERVAL (WEEKDAY(order_time)) DAY), "%Y-%m-%d")';
        orderBy = 'DATE_FORMAT(DATE_SUB(order_time, INTERVAL (WEEKDAY(order_time)) DAY), "%Y-%m-%d") DESC';
        break;
      case 'monthly':
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m")';
        dateFormat = 'DATE_FORMAT(order_time, "%Y-%m")';
        orderBy = 'DATE_FORMAT(order_time, "%Y-%m") DESC';
        break;
      default:
        groupBy = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00")';
        dateFormat = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00")';
        orderBy = 'DATE_FORMAT(order_time, "%Y-%m-%d %H:00:00") DESC';
    }

    // Get orders data grouped by time period
    const ordersQuery = `
      SELECT
        ${dateFormat} as time_period,
        COUNT(*) as order_count,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value
      FROM orders
      WHERE order_time >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 50
    `;

    const ordersResult = await executeQuery(ordersQuery);

    // Get total orders for the period
    const totalQuery = `
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE order_time >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    `;

    const totalResult = await executeQuery(totalQuery);

    return NextResponse.json({
      success: true,
      data: ordersResult,
      total_orders: (totalResult as any)[0]?.total_orders || 0,
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
