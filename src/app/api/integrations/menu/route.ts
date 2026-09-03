import { NextRequest } from 'next/server';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { getIntegrationMenu } from '@/lib/integration-menu';

export async function GET(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  try {
    const includeUnavailable = request.nextUrl.searchParams.get('include_unavailable') === 'true';
    const payload = await getIntegrationMenu(includeUnavailable);
    return integrationJson(request, {
      ...payload,
      etag: payload.content_hash,
    });
  } catch (error) {
    console.error('[integration] menu GET failed', error);
    return integrationJson(request, { error: 'Failed to fetch menu' }, 500);
  }
}
