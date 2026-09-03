import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { mapOrderRow } from '@/lib/order-utils';
import { fireCatalogWebhook } from '@/lib/integration-webhooks';

export async function GET() {
  try {
    let rows: any[];
    try {
      rows = await executeQuery(
        `SELECT id, order_number, items, total, status, payment_status, order_time, order_type, table_id, customer_name, customer_phone
         FROM orders
         WHERE status = 'preparing'
         ORDER BY order_time ASC
         LIMIT 150`
      ) as any[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!(message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR'))) {
        throw error;
      }
      rows = await executeQuery(
        `SELECT id, order_number, items, total, status, payment_status, order_time, order_type, table_id
         FROM orders
         WHERE status = 'preparing'
         ORDER BY order_time ASC
         LIMIT 150`
      ) as any[];
    }

    return NextResponse.json((rows || []).map(mapOrderRow));
  } catch (error) {
    console.error('Error fetching chef orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chef orders' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id } = await request.json();

    await executeQuery(
      'UPDATE orders SET status = "ready" WHERE id = ?',
      [id]
    );

    if (id) fireCatalogWebhook(id, 'order.updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
