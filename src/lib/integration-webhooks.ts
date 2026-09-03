import { createHmac } from 'crypto';
import { executeQuery } from '@/lib/db';
import { parseOrderItems } from '@/lib/order-utils';
import { sqlRows } from '@/lib/sql-rows';

function isUnknownColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR');
}

export type CatalogWebhookEvent = 'order.updated' | 'order.paid' | 'order.deleted';

export async function notifyCatalogOrderChange(orderId: string, event: CatalogWebhookEvent) {
  const webhookUrl = (process.env.CATALOG_WEBHOOK_URL || '').trim();
  const secret = (process.env.INTEGRATION_WEBHOOK_SECRET || '').trim();
  if (!webhookUrl || !secret) return;

  try {
    const rows = sqlRows(await executeQuery(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.items, o.total,
              o.updated_time, o.external_source, o.external_ref, t.table_code
       FROM orders o
       LEFT JOIN tables_master t ON o.table_id = t.id
       WHERE o.id = ?
       LIMIT 1`,
      [orderId]
    ));

    const order = rows?.[0];
    if (!order) return;

    const isCatalog =
      order.external_source === 'digital_catalog' || Boolean(order.external_ref);
    if (!isCatalog) return;

    const payload = {
      event,
      order_id: order.id,
      order_number: order.order_number,
      status: event === 'order.deleted' ? 'cancelled' : order.status,
      payment_status: order.payment_status || 'pending',
      items: parseOrderItems(order.items),
      total: Number(order.total),
      table_code: order.table_code ?? null,
      updated_at: order.updated_time || new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      body,
    });

    if (!response.ok) {
      console.error('[integration] webhook failed', response.status, await response.text().catch(() => ''));
    }
  } catch (error) {
    if (isUnknownColumn(error)) {
      return;
    }
    console.error('[integration] webhook error', error);
  }
}

export function fireCatalogWebhook(orderId: string, event: CatalogWebhookEvent) {
  void notifyCatalogOrderChange(orderId, event);
}
