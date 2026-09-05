import { executeQuery } from '@/lib/db';
import { sqlRows } from '@/lib/sql-rows';
import { parseMenuItemIds, type OfferRule } from '@/lib/offer-calc';

function unknownColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown column') || message.includes("doesn't exist") || message.includes('ER_NO_SUCH_TABLE') || message.includes('ER_BAD_FIELD_ERROR');
}

export type OfferRow = OfferRule & {
  id: number;
  max_uses_per_phone: number;
  max_uses_total: number | null;
  require_phone: boolean;
  stackable: boolean;
};

function mapOffer(row: Record<string, unknown>): OfferRow {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    scope: row.scope === 'dish' ? 'dish' : 'bill',
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
    discount_value: Number(row.discount_value),
    menu_item_ids: parseMenuItemIds(row.menu_item_ids),
    min_bill: Number(row.min_bill || 0),
    is_active: Boolean(Number(row.is_active)),
    starts_at: (row.starts_at as string) || null,
    ends_at: (row.ends_at as string) || null,
    max_uses_per_phone: Number(row.max_uses_per_phone ?? 1),
    max_uses_total: row.max_uses_total == null ? null : Number(row.max_uses_total),
    require_phone: Boolean(Number(row.require_phone ?? 1)),
    stackable: Boolean(Number(row.stackable ?? 0)),
  };
}

export async function listOffers() {
  try {
    const rows = sqlRows(await executeQuery(
      `SELECT id, code, name, scope, discount_type, discount_value, menu_item_ids,
              starts_at, ends_at, max_uses_per_phone, max_uses_total, min_bill,
              require_phone, stackable, is_active
       FROM offers
       ORDER BY id DESC`
    ));
    return rows.map(mapOffer);
  } catch (error) {
    if (unknownColumn(error)) return [];
    throw error;
  }
}

export async function getOfferByCode(code: string) {
  const rows = sqlRows(await executeQuery(
    `SELECT id, code, name, scope, discount_type, discount_value, menu_item_ids,
            starts_at, ends_at, max_uses_per_phone, max_uses_total, min_bill,
            require_phone, stackable, is_active
     FROM offers
     WHERE code = ?
     LIMIT 1`,
    [code]
  ));
  return rows[0] ? mapOffer(rows[0]) : null;
}

export async function countUsedRedemptions(offerId: number, phone?: string) {
  if (phone) {
    const rows = sqlRows(await executeQuery(
      `SELECT COUNT(*) AS count FROM offer_redemptions
       WHERE offer_id = ? AND customer_phone = ? AND status = 'used'`,
      [offerId, phone]
    ));
    return Number(rows[0]?.count || 0);
  }
  const rows = sqlRows(await executeQuery(
    `SELECT COUNT(*) AS count FROM offer_redemptions WHERE offer_id = ? AND status = 'used'`,
    [offerId]
  ));
  return Number(rows[0]?.count || 0);
}

export async function insertRedemption(input: {
  offerId: number;
  orderId: string;
  phone: string;
  discount: number;
}) {
  await executeQuery(
    `INSERT INTO offer_redemptions (offer_id, order_id, customer_phone, discount_amount, status)
     VALUES (?, ?, ?, ?, 'used')`,
    [input.offerId, input.orderId, input.phone, input.discount]
  );
}

export async function voidRedemptionsForOrder(orderId: string) {
  try {
    await executeQuery(
      `UPDATE offer_redemptions
       SET status = 'void', customer_phone = CONCAT('VOID:', order_id)
       WHERE order_id = ? AND status = 'used'`,
      [orderId]
    );
  } catch (error) {
    if (!unknownColumn(error)) throw error;
  }
}
