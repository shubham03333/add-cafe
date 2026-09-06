import { NextRequest } from 'next/server';
import { integrationJson, requireIntegrationAuth } from '@/lib/integration-auth';
import { inferOfferAudience, isOfferInWindow, normalizeOfferPhone } from '@/lib/offer-calc';
import { countUsedRedemptions, listOffers } from '@/lib/offers-db';

export async function GET(request: NextRequest) {
  const denied = requireIntegrationAuth(request);
  if (denied) return denied;

  try {
    const phone = normalizeOfferPhone(request.nextUrl.searchParams.get('phone') || '');
    const offers = await listOffers();
    const active = offers.filter((offer) => isOfferInWindow(offer));

    const payload = await Promise.all(
      active.map(async (offer) => {
        const used =
          phone && offer.max_uses_per_phone > 0
            ? (await countUsedRedemptions(offer.id, phone)) >= offer.max_uses_per_phone
            : false;
        return {
          id: offer.id,
          code: offer.code,
          name: offer.name,
          scope: offer.scope,
          discount_type: offer.discount_type,
          discount_value: Number(offer.discount_value),
          menu_item_ids: offer.menu_item_ids,
          min_bill: Number(offer.min_bill || 0),
          audience: inferOfferAudience(offer.code, offer.name),
          used,
          is_active: true,
        };
      })
    );

    return integrationJson(request, { offers: payload });
  } catch (error) {
    console.error('[integration] offers GET failed', error);
    return integrationJson(request, { error: 'Failed to fetch offers' }, 500);
  }
}
