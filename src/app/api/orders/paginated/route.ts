import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { getSqlDayRange } from '@/lib/date-range';
import { mapOrderRow } from '@/lib/order-utils';

const ALLOWED_SORT = new Set(['order_number', 'total', 'order_time', 'status']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const status = searchParams.get('status') || '';
    const sortBy = ALLOWED_SORT.has(searchParams.get('sortBy') || '') ? searchParams.get('sortBy')! : 'order_time';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const todayFilter = searchParams.get('today') === 'true';
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (todayFilter) {
      const today = await getTodayDateString();
      const { start, end } = getSqlDayRange(today);
      whereClauses.push('order_time >= ? AND order_time < ?');
      params.push(start, end);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countResult, orders] = await Promise.all([
      executeQuery(`SELECT COUNT(*) as total FROM orders ${whereSql}`, params) as Promise<any[]>,
      (async () => {
        try {
          return await executeQuery(
            `SELECT id, order_number, items, total, status, payment_status, payment_mode, order_time, customer_name, customer_phone
             FROM orders
             ${whereSql}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
          ) as any[];
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!(message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR'))) {
            throw error;
          }
          return await executeQuery(
            `SELECT id, order_number, items, total, status, payment_status, payment_mode, order_time
             FROM orders
             ${whereSql}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
          ) as any[];
        }
      })(),
    ]);

    const totalOrders = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalOrders / limit);

    return NextResponse.json({
      orders: (orders || []).map(mapOrderRow),
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching paginated orders:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
