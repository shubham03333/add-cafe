import { executeQuery } from '@/lib/db';

export type JunkPurgeCounts = {
  cancelledOrders: number;
  abandonedPending: number;
  expiredOtps: number;
  idempotency: number;
  qrSessions: number;
  oldOrderJsonCleared: number;
};

function affected(result: unknown) {
  if (result && typeof result === 'object' && 'affectedRows' in result) {
    return Number((result as { affectedRows: number }).affectedRows) || 0;
  }
  return 0;
}

function isMissingObject(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("doesn't exist") ||
    message.includes('Unknown table') ||
    message.includes('ER_NO_SUCH_TABLE') ||
    message.includes('Unknown column') ||
    message.includes('ER_BAD_FIELD_ERROR')
  );
}

async function safeDelete(label: string, sql: string, params: unknown[] = []) {
  try {
    const result = await executeQuery(sql, params);
    return affected(result);
  } catch (error) {
    if (isMissingObject(error)) {
      console.warn(`[junk-purge] skip ${label}: table/column not present`);
      return 0;
    }
    throw error;
  }
}

export async function purgeJunkData(): Promise<JunkPurgeCounts> {
  const cancelledOrders = await safeDelete(
    'cancelled orders',
    `DELETE FROM orders
     WHERE status = 'cancelled'
       AND order_time < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  const abandonedPending = await safeDelete(
    'abandoned pending',
    `DELETE FROM orders
     WHERE status = 'pending'
       AND (payment_status IS NULL OR payment_status <> 'paid')
       AND order_time < DATE_SUB(NOW(), INTERVAL 2 DAY)`
  );

  const expiredOtps = await safeDelete(
    'customer otps',
    `DELETE FROM customer_otps
     WHERE expires_at < NOW()
        OR (used = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`
  );

  const idempotency = await safeDelete(
    'idempotency',
    `DELETE FROM integration_idempotency
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  const qrSessions = await safeDelete(
    'qr sessions',
    `DELETE FROM table_qr_sessions
     WHERE closed_at IS NOT NULL
       AND closed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  let oldOrderJsonCleared = 0;
  for (let i = 0; i < 20; i += 1) {
    const n = await safeDelete(
      'old order json',
      `UPDATE orders
       SET items = '[]'
       WHERE order_time < DATE_SUB(NOW(), INTERVAL 1 YEAR)
         AND status IN ('served', 'cancelled')
         AND items IS NOT NULL
         AND CAST(items AS CHAR) NOT IN ('[]', 'null', '')
       LIMIT 500`
    );
    oldOrderJsonCleared += n;
    if (n < 500) break;
  }

  return {
    cancelledOrders,
    abandonedPending,
    expiredOtps,
    idempotency,
    qrSessions,
    oldOrderJsonCleared,
  };
}
