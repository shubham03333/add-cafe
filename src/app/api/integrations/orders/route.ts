import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { getSqlDayRange } from '@/lib/date-range';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { sqlRows } from '@/lib/sql-rows';
import { findActiveTableId } from '@/lib/find-active-table';

function isUnknownColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR');
}

type IncomingItem = {
  id: number;
  name?: string;
  price: number;
  quantity: number;
};

async function readIdempotentResponse(key: string) {
  try {
    const rows = sqlRows(await executeQuery(
      'SELECT response_json FROM integration_idempotency WHERE idempotency_key = ? LIMIT 1',
      [key]
    ));
    if (!rows?.[0]?.response_json) return null;
    const stored = rows[0].response_json;
    return typeof stored === 'string' ? JSON.parse(stored) : stored;
  } catch (error) {
    if (isUnknownColumn(error) || (error instanceof Error && error.message.includes("doesn't exist"))) {
      return null;
    }
    throw error;
  }
}

async function storeIdempotentResponse(key: string, body: unknown) {
  try {
    await executeQuery(
      'INSERT INTO integration_idempotency (idempotency_key, response_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE response_json = VALUES(response_json)',
      [key, JSON.stringify(body)]
    );
  } catch (error) {
    if (isUnknownColumn(error) || (error instanceof Error && error.message.includes("doesn't exist"))) {
      return;
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const idempotencyKey = String(body.idempotency_key || '').trim();
    if (!idempotencyKey || idempotencyKey.length > 64) {
      return integrationJson(request, { error: 'idempotency_key is required (max 64 chars)' }, 400);
    }

    const existing = await readIdempotentResponse(idempotencyKey);
    if (existing) return integrationJson(request, existing);

    const validOrderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
    const orderType = body.order_type;
    if (!orderType || !validOrderTypes.includes(orderType)) {
      return integrationJson(request, { error: 'Invalid order_type. Must be DINE_IN, TAKEAWAY, or DELIVERY' }, 400);
    }

    const items = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
    if (items.length === 0) {
      return integrationJson(request, { error: 'items are required' }, 400);
    }

    let tableId = null;
    if (orderType === 'DINE_IN') {
      const tableCode = String(body.table_code || '').trim();
      if (!tableCode) {
        return integrationJson(request, { error: 'table_code is required for DINE_IN orders' }, 400);
      }
      tableId = await findActiveTableId(tableCode);
      if (!tableId) {
        return integrationJson(request, { error: 'Invalid or inactive table' }, 400);
      }
    }

    const ids = items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length !== items.length) {
      return integrationJson(request, { error: 'Each item needs a valid numeric id' }, 400);
    }

    const placeholders = ids.map(() => '?').join(',');
    const menuRows = sqlRows(await executeQuery(
      `SELECT id, name, price, is_available FROM menu_items WHERE id IN (${placeholders})`,
      ids
    ));
    const menuById = new Map(menuRows.map((row) => [Number(row.id), row]));

    let computedTotal = 0;
    const normalizedItems = items.map((item) => {
      const menu = menuById.get(Number(item.id));
      return { item, menu };
    });

    for (const { item, menu } of normalizedItems) {
      if (!menu) {
        return integrationJson(request, { error: `Unknown menu item ${item.id}` }, 400);
      }
      if (!menu.is_available) {
        return integrationJson(request, { error: `Item ${menu.name} is not available` }, 400);
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return integrationJson(request, { error: `Invalid quantity for item ${item.id}` }, 400);
      }
      computedTotal += Number(menu.price) * quantity;
    }

    const clientTotal = Number(body.total);
    if (Number.isNaN(clientTotal) || Math.abs(clientTotal - computedTotal) > 0.01) {
      return integrationJson(request, {
        error: 'total does not match server calculation',
        expected_total: Number(computedTotal.toFixed(2)),
      }, 400);
    }

    const orderItems = normalizedItems.flatMap(({ item, menu }) => {
      if (!menu) return [];
      return [{
        id: Number(menu.id),
        name: String(menu.name),
        price: Number(menu.price),
        quantity: Number(item.quantity),
        is_available: true,
      }];
    });

    const orderId = uuidv4();
    const today = await getTodayDateString();
    const { start, end } = getSqlDayRange(today);
    const lastOrderResult = sqlRows(await executeQuery(
      `SELECT MAX(CAST(order_number AS UNSIGNED)) AS last_order_number
       FROM orders
       WHERE order_time >= ? AND order_time < ?`,
      [start, end]
    ));
    const lastOrderNumber = Number(lastOrderResult[0]?.last_order_number || 0);
    const newOrderNumber = (lastOrderNumber + 1).toString().padStart(3, '0');

    const source = String(body.source || 'digital_catalog').slice(0, 50);
    const customerRef = body.customer_ref ? String(body.customer_ref).slice(0, 100) : null;
    const createdAt = new Date().toISOString();

    try {
      await executeQuery(
        `INSERT INTO orders
          (id, order_number, items, total, status, payment_status, order_type, table_id, external_source, external_ref, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          newOrderNumber,
          JSON.stringify(orderItems),
          Number(computedTotal.toFixed(2)),
          'preparing',
          'pending',
          orderType,
          tableId,
          source,
          customerRef,
          idempotencyKey,
        ]
      );
    } catch (error) {
      if (!isUnknownColumn(error)) throw error;
      await executeQuery(
        'INSERT INTO orders (id, order_number, items, total, status, payment_status, order_type, table_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderId,
          newOrderNumber,
          JSON.stringify(orderItems),
          Number(computedTotal.toFixed(2)),
          'preparing',
          'pending',
          orderType,
          tableId,
        ]
      );
    }

    cache.delete(CACHE_KEYS.TODAY_SALES);
    cache.delete(CACHE_KEYS.TOTAL_REVENUE);
    cache.delete('tables_occupancy');
    cache.delete('integration_tables');

    const response = {
      id: orderId,
      order_number: newOrderNumber,
      status: 'preparing',
      created_at: createdAt,
    };
    await storeIdempotentResponse(idempotencyKey, response);
    return integrationJson(request, response, 201);
  } catch (error) {
    console.error('[integration] order POST failed', error);
    return integrationJson(request, { error: 'Failed to create order' }, 500);
  }
}
