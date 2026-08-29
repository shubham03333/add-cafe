import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest } from '@/types';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { getSqlDayRange } from '@/lib/date-range';
import { mapOrderRow, ORDER_LIST_COLUMNS } from '@/lib/order-utils';
import { cache, CACHE_KEYS } from '@/lib/cache';

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

function buildStatusFilter(statusFilter: string, includeServed: boolean) {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (statusFilter) {
    const statuses = statusFilter.split(',').map(s => s.trim()).filter(s => VALID_STATUSES.includes(s));
    if (statuses.length > 0) {
      whereClauses.push(`o.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  } else if (!includeServed) {
    whereClauses.push("o.status != 'served'");
  }

  return { whereClauses, params };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const includeServed = searchParams.get('includeServed') === 'true';
    const loadAll = searchParams.get('loadAll') === 'true';
    const tableId = searchParams.get('table_id');
    const orderNumber = searchParams.get('order_number');
    const paginated = searchParams.has('page') || searchParams.get('paginated') === 'true';

    const { whereClauses, params } = buildStatusFilter(statusFilter, includeServed);

    if (tableId) {
      whereClauses.push('o.table_id = ?');
      params.push(tableId);
    }

    if (orderNumber) {
      whereClauses.push('o.order_number = ?');
      params.push(orderNumber);
      const today = await getTodayDateString();
      const { start, end } = getSqlDayRange(today);
      whereClauses.push('o.order_time >= ? AND o.order_time < ?');
      params.push(start, end);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const selectSql = `
      SELECT ${ORDER_LIST_COLUMNS}, t.table_code, t.table_name
      FROM orders o
      LEFT JOIN tables_master t ON o.table_id = t.id
      ${whereSql}
    `;

    if (paginated && !orderNumber) {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
      const offset = (page - 1) * limit;

      const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereSql}`;
      const [countResult, rows] = await Promise.all([
        executeQuery(countQuery, params) as Promise<any[]>,
        executeQuery(
          `${selectSql} ORDER BY o.order_time DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        ) as Promise<any[]>,
      ]);

      const totalOrders = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalOrders / limit);

      return NextResponse.json({
        orders: (rows || []).map(mapOrderRow),
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    }

    const limit = loadAll ? 1000 : 200;
    const rows = await executeQuery(
      `${selectSql} ORDER BY o.order_time ${loadAll ? 'ASC' : 'DESC'} LIMIT ?`,
      [...params, limit]
    ) as any[];

    return NextResponse.json((rows || []).map(mapOrderRow));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const orderId = uuidv4();
    const today = await getTodayDateString();
    const { start, end } = getSqlDayRange(today);

    const validOrderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
    if (!body.order_type || !validOrderTypes.includes(body.order_type)) {
      return NextResponse.json(
        { error: 'Invalid order_type. Must be DINE_IN, TAKEAWAY, or DELIVERY' },
        { status: 400 }
      );
    }

    let tableId = null;
    if (body.order_type === 'DINE_IN') {
      if (!body.table_id) {
        return NextResponse.json(
          { error: 'table_id is required for DINE_IN orders' },
          { status: 400 }
        );
      }

      const tableCheck = await executeQuery(
        'SELECT id FROM tables_master WHERE table_code = ? AND is_active = 1 LIMIT 1',
        [body.table_id]
      ) as any[];

      if (tableCheck.length === 0) {
        return NextResponse.json(
          { error: 'Invalid or inactive table' },
          { status: 400 }
        );
      }

      tableId = tableCheck[0].id;
    }

    const lastOrderResult = await executeQuery(
      `SELECT MAX(CAST(order_number AS UNSIGNED)) AS last_order_number
       FROM orders
       WHERE order_time >= ? AND order_time < ?`,
      [start, end]
    ) as any[];
    const lastOrderNumber = lastOrderResult[0]?.last_order_number || 0;
    const newOrderNumber = (lastOrderNumber + 1).toString().padStart(3, '0');

    await executeQuery(
      'INSERT INTO orders (id, order_number, items, total, status, payment_status, order_type, table_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, newOrderNumber, JSON.stringify(body.items), body.total, 'preparing', 'pending', body.order_type, tableId]
    );

    cache.delete(CACHE_KEYS.TODAY_SALES);
    cache.delete(CACHE_KEYS.TOTAL_REVENUE);
    cache.delete('tables_occupancy');

    return NextResponse.json({ id: orderId, success: true, order_number: newOrderNumber });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
