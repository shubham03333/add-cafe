import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';

export async function GET() {
  try {
    const today = await getTodayDateString();

    // Get total sales from orders table for today (instead of daily_sales table)
    const totalRows = await executeQuery(
      `SELECT
        COUNT(*) as total_orders,
        SUM(total) as total_revenue
       FROM orders
       WHERE DATE(order_time) = ? AND payment_status = 'paid'`,
      [today]
    ) as any[];

    const totalData = totalRows.length > 0 ? totalRows[0] : { total_orders: 0, total_revenue: 0 };

    // Today's sales should always show actual revenue - no manual overrides for today
    // Manual overrides are only applied in historical sales reports, not for current day

    // Get payment mode breakdown from orders table
    const paymentRows = await executeQuery(
      `SELECT
        payment_mode,
        COUNT(*) as order_count,
        SUM(total) as revenue
       FROM orders
       WHERE DATE(order_time) = ? AND payment_status = 'paid'
       GROUP BY payment_mode`,
      [today]
    ) as any[];

    // Structure the payment breakdown
    const paymentBreakdown = {
      cash: { orders: 0, revenue: 0 },
      online: { orders: 0, revenue: 0 }
    };

    paymentRows.forEach((row: any) => {
      const mode = row.payment_mode as 'cash' | 'online';
      if (mode === 'cash' || mode === 'online') {
        paymentBreakdown[mode] = {
          orders: row.order_count,
          revenue: row.revenue
        };
      }
    });

    return NextResponse.json({
      ...totalData,
      payment_breakdown: paymentBreakdown
    });
  } catch (error) {
    console.error('Error fetching today\'s sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s sales' },
      { status: 500 }
    );
  }
}
