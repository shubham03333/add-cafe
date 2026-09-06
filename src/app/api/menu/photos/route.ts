import { NextResponse } from 'next/server';

function catalogOrigin() {
  const webhook = (process.env.CATALOG_WEBHOOK_URL || '').trim();
  if (webhook) {
    try {
      return new URL(webhook).origin;
    } catch {
      // ignore
    }
  }
  return (process.env.NEXT_PUBLIC_CATALOG_URL || '').trim().replace(/\/$/, '');
}

export async function GET() {
  const origin = catalogOrigin();
  if (!origin) {
    return NextResponse.json({ photos: {}, count: 0, error: 'Catalog URL is not configured' }, { status: 200 });
  }

  try {
    const response = await fetch(`${origin}/api/menu/photos`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = (await response.json().catch(() => ({}))) as { photos?: Record<string, string> };
    const photos = data.photos && typeof data.photos === 'object' ? data.photos : {};
    return NextResponse.json(
      { photos, count: Object.keys(photos).length },
      {
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      }
    );
  } catch (error) {
    console.error('menu photos proxy failed', error);
    return NextResponse.json({ photos: {}, count: 0 }, { status: 200 });
  }
}
