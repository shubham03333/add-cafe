import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

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
