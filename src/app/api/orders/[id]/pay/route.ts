import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { fireCatalogWebhook } from '@/lib/integration-webhooks';
import { closeQrSessionForOrder } from '@/lib/qr-table-session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { paymentMode } = await request.json();

    // Validate payment mode
    if (!paymentMode || !['cash', 'online'].includes(paymentMode)) {
      return NextResponse.json(
        { error: 'Invalid payment mode. Must be "cash" or "online"' },
        { status: 400 }
      );
    }

    // Update the order's payment status and payment mode
    await executeQuery(
      'UPDATE orders SET payment_status = ?, payment_mode = ? WHERE id = ?',
      ['paid', paymentMode, id]
    );

    cache.delete(CACHE_KEYS.TODAY_SALES);
    cache.delete(CACHE_KEYS.TOTAL_REVENUE);

    fireCatalogWebhook(id, 'order.paid');
    await closeQrSessionForOrder(id);
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
