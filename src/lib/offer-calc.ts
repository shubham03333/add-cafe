export type OfferScope = 'bill' | 'dish';
export type DiscountType = 'percent' | 'fixed';

export type OfferRule = {
  code: string;
  name: string;
  scope: OfferScope;
  discount_type: DiscountType;
  discount_value: number;
  menu_item_ids: number[] | null;
  min_bill: number;
  is_active: boolean;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  require_phone?: boolean;
};

export type OfferLine = {
  id: number;
  price: number;
  quantity: number;
};

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeOfferCode(code: string) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function normalizeOfferPhone(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidOfferPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

export function lineGross(items: OfferLine[]) {
  return roundMoney(
    (items || []).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  );
}

export function parseMenuItemIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  }
  if (typeof raw === 'string') {
    try {
      return parseMenuItemIds(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function isOfferInWindow(offer: OfferRule, now = new Date()) {
  if (!offer.is_active) return false;
  if (offer.starts_at) {
    const start = new Date(offer.starts_at);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (offer.ends_at) {
    const end = new Date(offer.ends_at);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

export function applyOffer(items: OfferLine[], offer: OfferRule) {
  const gross = lineGross(items);
  if (!isOfferInWindow(offer)) {
    return { ok: false as const, gross, discount: 0, net: gross, error: 'This offer is not active' };
  }
  if (gross < Number(offer.min_bill || 0)) {
    return {
      ok: false as const,
      gross,
      discount: 0,
      net: gross,
      error: `Minimum bill is ₹${Number(offer.min_bill).toFixed(0)}`,
    };
  }

  const percent = Number(offer.discount_value);
  if (!Number.isFinite(percent) || percent <= 0) {
    return { ok: false as const, gross, discount: 0, net: gross, error: 'Invalid offer value' };
  }

  let eligible = gross;
  if (offer.scope === 'dish') {
    const ids = new Set(parseMenuItemIds(offer.menu_item_ids));
    if (!ids.size) {
      return { ok: false as const, gross, discount: 0, net: gross, error: 'Offer has no dishes configured' };
    }
    eligible = roundMoney(
      items
        .filter((item) => ids.has(Number(item.id)))
        .reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
    );
    if (eligible <= 0) {
      return { ok: false as const, gross, discount: 0, net: gross, error: 'No matching dish on this bill' };
    }
  }

  let discount =
    offer.discount_type === 'fixed'
      ? roundMoney(Math.min(percent, eligible))
      : roundMoney((eligible * percent) / 100);

  if (offer.discount_type === 'percent' && percent > 100) {
    return { ok: false as const, gross, discount: 0, net: gross, error: 'Percent cannot exceed 100' };
  }

  if (discount > gross) discount = gross;
  const net = roundMoney(gross - discount);
  return { ok: true as const, gross, discount, net };
}
