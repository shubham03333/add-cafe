import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { listOffers } from '@/lib/offers-db';
import { normalizeOfferCode, parseMenuItemIds } from '@/lib/offer-calc';

export async function GET() {
  try {
    const offers = await listOffers();
    return NextResponse.json(offers);
  } catch (error) {
    console.error('list offers failed', error);
    return NextResponse.json({ error: 'Failed to load offers. Run the offers SQL on TiDB first.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeOfferCode(body.code);
    const name = String(body.name || '').trim();
    const scope = body.scope === 'dish' ? 'dish' : 'bill';
    const discount_type = body.discount_type === 'fixed' ? 'fixed' : 'percent';
    const discount_value = Number(body.discount_value);
    const menu_item_ids = scope === 'dish' ? parseMenuItemIds(body.menu_item_ids) : [];

    if (!code || code.length < 3 || code.length > 32) {
      return NextResponse.json({ error: 'Code must be 3-32 characters' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!Number.isFinite(discount_value) || discount_value <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 });
    }
    if (discount_type === 'percent' && discount_value > 100) {
      return NextResponse.json({ error: 'Percent cannot exceed 100' }, { status: 400 });
    }
    if (scope === 'dish' && menu_item_ids.length === 0) {
      return NextResponse.json({ error: 'Pick at least one dish' }, { status: 400 });
    }

    await executeQuery(
      `INSERT INTO offers
        (code, name, scope, discount_type, discount_value, menu_item_ids, starts_at, ends_at,
         max_uses_per_phone, max_uses_total, min_bill, require_phone, stackable, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name.slice(0, 120),
        scope,
        discount_type,
        discount_value,
        JSON.stringify(menu_item_ids),
        body.starts_at || null,
        body.ends_at || null,
        Math.max(1, Number(body.max_uses_per_phone) || 1),
        body.max_uses_total ? Number(body.max_uses_total) : null,
        Number(body.min_bill) || 0,
        body.require_phone === false ? 0 : 1,
        body.stackable ? 1 : 0,
        body.is_active === false ? 0 : 1,
      ]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate/i.test(message)) {
      return NextResponse.json({ error: 'That offer code already exists' }, { status: 409 });
    }
    console.error('create offer failed', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}
