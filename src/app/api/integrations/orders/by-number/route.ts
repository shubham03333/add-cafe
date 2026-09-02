import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSqlDayRange } from '@/lib/date-range';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { mapOrderRow } from '@/lib/order-utils';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { sqlRows } from '@/lib/sql-rows';

export async function GET(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  try {
    const orderNumber = request.nextUrl.searchParams.get('order_number') || '';
    if (!orderNumber) {
      return integrationJson(request, { error: 'order_number is required' }, 400);
    }

    const date = request.nextUrl.searchParams.get('date') || (await getTodayDateString());
    const { start, end } = getSqlDayRange(date);

    const rows = sqlRows(await executeQuery(
      `SELECT o.id, o.order_number, o.items, o.total, o.status, o.payment_status,
              o.updated_time, t.table_code
       FROM orders o
       LEFT JOIN tables_master t ON o.table_id = t.id
       WHERE o.order_number = ?
         AND o.order_time >= ? AND o.order_time < ?
       ORDER BY o.order_time DESC
       LIMIT 1`,
      [orderNumber, start, end]
    ));

    if (!rows?.[0]) {
      return integrationJson(request, { error: 'Order not found' }, 404);
    }

    const order = mapOrderRow(rows[0]);
    return integrationJson(request, {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      items: order.items,
      total: Number(order.total),
      table_code: order.table_code ?? null,
      updated_time: order.updated_time ?? null,
    });
  } catch (error) {
    console.error('[integration] order by-number GET failed', error);
    return integrationJson(request, { error: 'Failed to fetch order' }, 500);
  }
}
