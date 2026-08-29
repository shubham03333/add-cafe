import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { mapOrderRow } from '@/lib/order-utils';

export async function GET() {
  try {
    const rows = await executeQuery(
      `SELECT id, order_number, items, total, status, payment_status, order_time, order_type, table_id
       FROM orders
       WHERE status IN ('pending', 'preparing')
       ORDER BY order_time ASC
       LIMIT 150`
    ) as any[];

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
