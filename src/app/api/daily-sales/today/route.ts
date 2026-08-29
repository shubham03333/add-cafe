import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { getSqlDayRange } from '@/lib/date-range';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cached = cache.get(CACHE_KEYS.TODAY_SALES);
    if (cached) {
      return NextResponse.json(cached);
    }

    const today = await getTodayDateString();
    const { start, end } = getSqlDayRange(today);

    const totalRows = await executeQuery(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        SUM(CASE WHEN payment_mode = 'cash' THEN 1 ELSE 0 END) as cash_orders,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_revenue,
        SUM(CASE WHEN payment_mode = 'online' THEN 1 ELSE 0 END) as online_orders,
        COALESCE(SUM(CASE WHEN payment_mode = 'online' THEN total ELSE 0 END), 0) as online_revenue
       FROM orders
       WHERE order_time >= ? AND order_time < ? AND payment_status = 'paid'`,
      [start, end]
    ) as any[];

    const row = totalRows[0] || {};
    const payload = {
      total_orders: row.total_orders || 0,
      total_revenue: row.total_revenue || 0,
      payment_breakdown: {
        cash: { orders: Number(row.cash_orders) || 0, revenue: Number(row.cash_revenue) || 0 },
        online: { orders: Number(row.online_orders) || 0, revenue: Number(row.online_revenue) || 0 }
      }
    };

    cache.set(CACHE_KEYS.TODAY_SALES, payload, CACHE_TTL.SALES_DATA);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching today\'s sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s sales' },
      { status: 500 }
    );
  }
}
