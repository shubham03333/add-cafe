import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { fireCatalogWebhook } from '@/lib/integration-webhooks';
import { closeQrSessionForOrder } from '@/lib/qr-table-session';
import { parseOrderItems } from '@/lib/order-utils';
import { sqlRows } from '@/lib/sql-rows';
import {
  applyOffer,
  isValidOfferPhone,
  normalizeOfferCode,
  normalizeOfferPhone,
} from '@/lib/offer-calc';
import { countUsedRedemptions, getOfferByCode, insertRedemption, voidRedemptionsForOrder } from '@/lib/offers-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const paymentMode = body.paymentMode;
    const orderRows = sqlRows(
      await executeQuery(
        'SELECT items, offer_code, customer_phone FROM orders WHERE id = ? LIMIT 1',
        [id]
      )
    );
    const offerCode = normalizeOfferCode(body.offerCode || orderRows[0]?.offer_code || '');
    const phone = normalizeOfferPhone(
      body.customerPhone || body.customer_phone || orderRows[0]?.customer_phone || ''
    );

    if (!paymentMode || !['cash', 'online'].includes(paymentMode)) {
      return NextResponse.json(
        { error: 'Invalid payment mode. Must be "cash" or "online"' },
        { status: 400 }
      );
    }

    let gross: number | null = null;
    let discount = 0;
    let net: number | null = null;
    let appliedCode: string | null = null;

    if (offerCode) {
      const offer = await getOfferByCode(offerCode);
      if (!offer) {
        return NextResponse.json({ error: 'Unknown offer code' }, { status: 400 });
      }
      if (offer.require_phone && !isValidOfferPhone(phone)) {
        return NextResponse.json({ error: 'Enter the customer mobile to use this offer' }, { status: 400 });
      }
      if (isValidOfferPhone(phone) && offer.max_uses_per_phone > 0) {
        const used = await countUsedRedemptions(offer.id, phone);
        if (used >= offer.max_uses_per_phone) {
          return NextResponse.json({ error: 'This code was already used on this number' }, { status: 409 });
        }
      }
      if (offer.max_uses_total) {
        const totalUsed = await countUsedRedemptions(offer.id);
        if (totalUsed >= offer.max_uses_total) {
          return NextResponse.json({ error: 'This campaign has no uses left' }, { status: 409 });
        }
      }

      const items = parseOrderItems(orderRows[0]?.items);
      const result = applyOffer(items, offer);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      gross = result.gross;
      discount = result.discount;
      net = result.net;
      appliedCode = offer.code;

      try {
        await insertRedemption({
          offerId: offer.id,
          orderId: id,
          phone: isValidOfferPhone(phone) ? phone : `ORDER:${id}`,
          discount: result.discount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/duplicate/i.test(message)) {
          return NextResponse.json({ error: 'This code was already used on this number' }, { status: 409 });
        }
        throw error;
      }
    }

    try {
      if (net != null && gross != null) {
        try {
          await executeQuery(
            `UPDATE orders
             SET payment_status = ?, payment_mode = ?, total = ?, gross_total = ?, discount_total = ?, offer_code = ?
                 ${isValidOfferPhone(phone) ? ', customer_phone = ?' : ''}
             WHERE id = ?`,
            isValidOfferPhone(phone)
              ? ['paid', paymentMode, net, gross, discount, appliedCode, phone, id]
              : ['paid', paymentMode, net, gross, discount, appliedCode, id]
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!(message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR'))) {
            throw error;
          }
          await executeQuery(
            'UPDATE orders SET payment_status = ?, payment_mode = ?, total = ? WHERE id = ?',
            ['paid', paymentMode, net, id]
          );
        }
      } else {
        await executeQuery(
          'UPDATE orders SET payment_status = ?, payment_mode = ? WHERE id = ?',
          ['paid', paymentMode, id]
        );
      }
    } catch (error) {
      if (appliedCode) await voidRedemptionsForOrder(id);
      throw error;
    }

    cache.delete(CACHE_KEYS.TODAY_SALES);
    cache.delete(CACHE_KEYS.TOTAL_REVENUE);

    fireCatalogWebhook(id, 'order.paid');
    await closeQrSessionForOrder(id);
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      total: net,
      discount_total: discount,
      gross_total: gross,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
