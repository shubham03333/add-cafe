import { NextRequest, NextResponse } from 'next/server';
import { purgeJunkData } from '@/lib/junk-purge';

function authorized(request: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await purgeJunkData();
    return NextResponse.json({
      ok: true,
      kept: 'order rows, totals, and daily_sales were not deleted; dish JSON older than 1 year is cleared',
      deleted,
    });
  } catch (error) {
    console.error('[junk-purge] failed', error);
    return NextResponse.json({ ok: false, error: 'Junk purge failed' }, { status: 500 });
  }
}
