import { NextRequest } from 'next/server';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { getIntegrationMenuDelta } from '@/lib/integration-menu';

export async function GET(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  const since = request.nextUrl.searchParams.get('since') || '';
  if (!since || Number.isNaN(Date.parse(since))) {
    return integrationJson(request, { error: 'since must be a valid ISO timestamp' }, 400);
  }

  try {
    const includeUnavailable = request.nextUrl.searchParams.get('include_unavailable') === 'true';
    const payload = await getIntegrationMenuDelta(since, includeUnavailable);
    return integrationJson(request, payload);
  } catch (error) {
    console.error('[integration] menu delta GET failed', error);
    return integrationJson(request, { error: 'Failed to fetch menu delta' }, 500);
  }
}
