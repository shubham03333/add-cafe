import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { UpdateOrderRequest } from '@/types';
import { getTodayDateString } from '@/lib/timezone-dynamic';
import { adjustMenuStock } from '@/lib/stock';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { fireCatalogWebhook, notifyCatalogOrderChange } from '@/lib/integration-webhooks';
import { closeQrSessionForOrder, markQrSessionAcceptedForOrder } from '@/lib/qr-table-session';
import { voidRedemptionsForOrder } from '@/lib/offers-db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: UpdateOrderRequest = await request.json();
    const { id } = await params;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (body.items) {
      updateFields.push('items = ?');
      values.push(JSON.stringify(body.items));
    }

    if (body.total !== undefined) {
      updateFields.push('total = ?');
      values.push(body.total);
    }

    if (body.status) {
      updateFields.push('status = ?');
      values.push(body.status);
    }

    if (body.payment_status) {
      updateFields.push('payment_status = ?');
      values.push(body.payment_status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await executeQuery(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (body.status === 'preparing' || body.status === 'ready') {
      await markQrSessionAcceptedForOrder(id);
    }

    if (body.payment_status === 'paid') {
      await closeQrSessionForOrder(id);
    }

    if (body.status === 'served') {
      const orderRows = await executeQuery(
        'SELECT total FROM orders WHERE id = ? LIMIT 1',
        [id]
      ) as any[];

      if (orderRows && orderRows.length > 0) {
        const orderTotal = orderRows[0].total;
        const today = await getTodayDateString();

        await executeQuery(`
          INSERT INTO daily_sales (sale_date, total_orders, total_revenue)
          VALUES (?, 1, ?)
          ON DUPLICATE KEY UPDATE
            total_orders = total_orders + 1,
            total_revenue = total_revenue + ?
        `, [today, orderTotal, orderTotal]);
      }

      cache.delete(CACHE_KEYS.TODAY_SALES);
      cache.delete(CACHE_KEYS.TOTAL_REVENUE);
      cache.delete('tables_occupancy');
    }

    if (body.status === 'served' && body.items?.length) {
      await adjustMenuStock(
        body.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          action: 'subtract' as const
        }))
      );
    }

    if (body.status && body.status !== 'served') {
      cache.delete('tables_occupancy');
    }

    fireCatalogWebhook(id, 'order.updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await voidRedemptionsForOrder(id);
    await notifyCatalogOrderChange(id, 'order.deleted');
    await executeQuery('DELETE FROM orders WHERE id = ?', [id]);
    cache.delete('tables_occupancy');
    cache.delete(CACHE_KEYS.TODAY_SALES);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
