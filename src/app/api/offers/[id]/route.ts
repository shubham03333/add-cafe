import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { parseMenuItemIds, normalizeOfferCode } from '@/lib/offer-calc';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const code = normalizeOfferCode(body.code);
    const name = String(body.name || '').trim();
    const scope = body.scope === 'dish' ? 'dish' : 'bill';
    const discount_type = body.discount_type === 'fixed' ? 'fixed' : 'percent';
    const discount_value = Number(body.discount_value);
    const menu_item_ids = scope === 'dish' ? parseMenuItemIds(body.menu_item_ids) : [];

    if (!code || !name || !Number.isFinite(discount_value) || discount_value <= 0) {
      return NextResponse.json({ error: 'Invalid offer fields' }, { status: 400 });
    }

    await executeQuery(
      `UPDATE offers SET
         code = ?, name = ?, scope = ?, discount_type = ?, discount_value = ?,
         menu_item_ids = ?, starts_at = ?, ends_at = ?, max_uses_per_phone = ?,
         max_uses_total = ?, min_bill = ?, require_phone = ?, stackable = ?, is_active = ?
       WHERE id = ?`,
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
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('update offer failed', error);
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await executeQuery('UPDATE offers SET is_active = 0 WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('disable offer failed', error);
    return NextResponse.json({ error: 'Failed to disable offer' }, { status: 500 });
  }
}
