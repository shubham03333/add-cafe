import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';

export async function GET() {
  try {
    const today = await getTodayDateString();

    // Get total sales from daily_sales table
    const dailyRows = await executeQuery(
      'SELECT total_orders, total_revenue FROM daily_sales WHERE sale_date = ?',
      [today]
    ) as any[];

    const totalData = dailyRows.length > 0 ? dailyRows[0] : { total_orders: 0, total_revenue: 0 };

    // Get payment mode breakdown from orders table
    const paymentRows = await executeQuery(
      `SELECT
        payment_mode,
        COUNT(*) as order_count,
        SUM(total) as revenue
       FROM orders
       WHERE DATE(order_time) = ? AND status = 'served'
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
