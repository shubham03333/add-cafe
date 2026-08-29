import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cached = cache.get(CACHE_KEYS.TOTAL_REVENUE);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await executeQuery(
      `SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders
       FROM orders
       WHERE status = 'served'`
    ) as any[];

    const payload = {
      total_revenue: result[0]?.total_revenue || 0,
      total_orders: result[0]?.total_orders || 0
    };

    cache.set(CACHE_KEYS.TOTAL_REVENUE, payload, CACHE_TTL.TOTAL_REVENUE);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total revenue' },
      { status: 500 }
    );
  }
}
