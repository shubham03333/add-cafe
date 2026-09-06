import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { setMenuItemStockout } from '@/lib/daily-stockout';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const out = body.out !== false && body.out !== 0;
    const result = await setMenuItemStockout(id, Boolean(out));
    cache.deleteByPrefix('menu_items');
    cache.deleteByPrefix('integration_menu');
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update stock';
    console.error('stockout update failed', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
