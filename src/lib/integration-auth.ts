import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };

const hits = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 300;

function prune(now: number) {
  if (hits.size < 2000) return;
  for (const [key, bucket] of hits) {
    if (bucket.resetAt < now) hits.delete(key);
  }
}

function rateLimit(ip: string) {
  const now = Date.now();
  prune(now);
  const bucket = hits.get(ip);
  if (!bucket || bucket.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }
  if (bucket.count >= LIMIT) {
    return { ok: false as const, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true as const };
}

function safeEqual(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function integrationCorsHeaders(request: NextRequest) {
  const allowed = (process.env.CATALOG_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Integration-Key';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers.Vary = 'Origin';
  }
  return headers;
}

export function integrationJson(request: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: integrationCorsHeaders(request),
  });
}

export function requireIntegrationAuth(request: NextRequest): NextResponse | null {
  const expected = (process.env.INTEGRATION_API_KEY || '').trim();
  if (!expected) {
    console.error('[integration] INTEGRATION_API_KEY is not configured');
    return integrationJson(request, { error: 'Integration API is not configured' }, 503);
  }

  const bearer = request.headers.get('authorization');
  const headerKey = request.headers.get('x-integration-key') || '';
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : headerKey.trim();

  if (!token || !safeEqual(token, expected)) {
    return integrationJson(request, { error: 'Unauthorized' }, 401);
  }

  const limited = rateLimit('integration-api-key');
  if (!limited.ok) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        ...integrationCorsHeaders(request),
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((limited.retryAfterMs ?? WINDOW_MS) / 1000)),
      },
    });
  }

  return null;
}
