import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { parseOrderItems } from '@/lib/order-utils';
import { sqlRows } from '@/lib/sql-rows';
import {
  applyOffer,
  isValidOfferPhone,
  normalizeOfferCode,
  normalizeOfferPhone,
} from '@/lib/offer-calc';
import { countUsedRedemptions, getOfferByCode } from '@/lib/offers-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeOfferCode(body.code);
    const phone = normalizeOfferPhone(body.customer_phone || '');
    const orderId = String(body.order_id || '');

    if (!code) return NextResponse.json({ error: 'Enter an offer code' }, { status: 400 });

    const offer = await getOfferByCode(code);
    if (!offer) return NextResponse.json({ error: 'Unknown offer code' }, { status: 404 });

    if (offer.require_phone && !isValidOfferPhone(phone)) {
      return NextResponse.json({ error: 'A valid mobile number is required for this offer' }, { status: 400 });
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

    let items = Array.isArray(body.items) ? body.items : [];
    if ((!items.length) && orderId) {
      const rows = sqlRows(await executeQuery('SELECT items FROM orders WHERE id = ? LIMIT 1', [orderId]));
      items = parseOrderItems(rows[0]?.items);
    }

    const result = applyOffer(items, offer);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      offer: { id: offer.id, code: offer.code, name: offer.name, scope: offer.scope },
      ...result,
    });
  } catch (error) {
    console.error('preview offer failed', error);
    return NextResponse.json({ error: 'Could not preview offer' }, { status: 500 });
  }
}
