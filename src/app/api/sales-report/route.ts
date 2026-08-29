import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { logMemoryUsage } from '@/lib/memory-monitor';
import { parseOrderItems } from '@/lib/order-utils';

export async function GET(request: NextRequest) {
  try {
    logMemoryUsage('/api/sales-report');

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    const rangeStart = `${startDate} 00:00:00`;
    const rangeEnd = `${endDate} 23:59:59`;

    const [salesSummary, dailySales, ordersData] = await Promise.all([
      executeQuery(
        `SELECT
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as total_orders
         FROM orders
         WHERE order_time >= ? AND order_time <= ?
           AND payment_status = 'paid'`,
        [rangeStart, rangeEnd]
      ) as Promise<any[]>,
      executeQuery(
        `SELECT
          DATE_FORMAT(order_time, '%Y-%m-%d') as date,
          SUM(total) as revenue,
          COUNT(*) as orders
         FROM orders
         WHERE order_time >= ? AND order_time <= ?
           AND payment_status = 'paid'
         GROUP BY DATE_FORMAT(order_time, '%Y-%m-%d')
         ORDER BY date DESC`,
        [rangeStart, rangeEnd]
      ) as Promise<any[]>,
      executeQuery(
        `SELECT items
         FROM orders
         WHERE order_time >= ? AND order_time <= ?
           AND status = 'served'`,
        [rangeStart, rangeEnd]
      ) as Promise<any[]>,
    ]);

    const itemMap = new Map<string, number>();
    (ordersData || []).forEach(order => {
      const items = parseOrderItems(order.items);
      items.forEach((item: any) => {
        const name = item.name?.trim();
        const quantity = parseInt(item.quantity, 10) || 0;
        if (name && quantity > 0) {
          itemMap.set(name, (itemMap.get(name) || 0) + quantity);
        }
      });
    });

    const topItems = Array.from(itemMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      total_revenue: salesSummary[0]?.total_revenue || 0,
      total_orders: salesSummary[0]?.total_orders || 0,
      daily_sales: dailySales || [],
      top_items: topItems
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      { error: 'Failed to generate sales report' },
      { status: 500 }
    );
  }
}
