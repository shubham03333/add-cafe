import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { closeQrSessionForTable, openQrSession } from '@/lib/qr-table-session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);
    if (!Number.isInteger(tableId) || tableId < 1) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').toLowerCase();

    const existing = await executeQuery(
      'SELECT id FROM tables_master WHERE id = ? AND is_active = 1 LIMIT 1',
      [tableId]
    ) as any[];
    if (!existing?.length) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (action === 'close') {
      await closeQrSessionForTable(tableId);
      return NextResponse.json({ ok: true, qr_session_open: false });
    }

    if (action === 'open') {
      await openQrSession(tableId, 'staff');
      return NextResponse.json({ ok: true, qr_session_open: true });
    }

    return NextResponse.json({ error: 'action must be open or close' }, { status: 400 });
  } catch (error) {
    console.error('QR session update failed', error);
    return NextResponse.json({ error: 'Failed to update table QR session' }, { status: 500 });
  }
}
