import { executeQuery } from '@/lib/db';
import { sqlRows } from '@/lib/sql-rows';
import { cache } from '@/lib/cache';

const SESSION_MINUTES = Math.max(30, Number(process.env.QR_SESSION_MINUTES || 150) || 150);
const GAP_MINUTES = Math.max(5, Number(process.env.QR_ACCEPT_GAP_MINUTES || 30) || 30);
const REOPEN_COOLDOWN_MINUTES = Math.max(
  SESSION_MINUTES,
  Number(process.env.QR_REOPEN_COOLDOWN_MINUTES || 360) || 360
);

export const QR_SESSION_CLOSED_MESSAGE =
  'This table is closed for ordering. Please ask staff to start the table.';
export const QR_WAIT_STAFF_MESSAGE =
  'Staff still need to confirm the first order at this table.';

type SessionRow = {
  id: number;
  table_id: number;
  opened_at: Date | string;
  expires_at: Date | string;
  closed_at: Date | string | null;
  last_accepted_at: Date | string | null;
  opened_by: string;
};

let schemaReady = false;

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}

export function qrSessionCacheBust() {
  cache.delete('tables_occupancy');
  cache.delete('integration_tables');
}

async function ensureSchema() {
  if (schemaReady) return;
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS table_qr_sessions (
      id INT NOT NULL AUTO_INCREMENT,
      table_id INT NOT NULL,
      opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      closed_at TIMESTAMP NULL,
      last_accepted_at TIMESTAMP NULL,
      opened_by VARCHAR(16) NOT NULL DEFAULT 'qr',
      PRIMARY KEY (id),
      KEY idx_table_qr_open (table_id, closed_at, expires_at)
    )
  `);
  schemaReady = true;
}

export async function ensureQrSessionSchema() {
  await ensureSchema();
}

async function expireStale(tableId?: number) {
  await ensureSchema();
  if (tableId) {
    await executeQuery(
      'UPDATE table_qr_sessions SET closed_at = NOW() WHERE table_id = ? AND closed_at IS NULL AND expires_at <= NOW()',
      [tableId]
    );
    return;
  }
  await executeQuery(
    'UPDATE table_qr_sessions SET closed_at = NOW() WHERE closed_at IS NULL AND expires_at <= NOW()'
  );
}

export async function getOpenQrSession(tableId: number): Promise<SessionRow | null> {
  await expireStale(tableId);
  const rows = sqlRows(await executeQuery(
    `SELECT id, table_id, opened_at, expires_at, closed_at, last_accepted_at, opened_by
     FROM table_qr_sessions
     WHERE table_id = ? AND closed_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [tableId]
  ));
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    table_id: Number(row.table_id),
    opened_at: row.opened_at as Date | string,
    expires_at: row.expires_at as Date | string,
    closed_at: (row.closed_at as Date | string | null) ?? null,
    last_accepted_at: (row.last_accepted_at as Date | string | null) ?? null,
    opened_by: String(row.opened_by || 'qr'),
  };
}

async function latestSession(tableId: number): Promise<SessionRow | null> {
  const rows = sqlRows(await executeQuery(
    `SELECT id, table_id, opened_at, expires_at, closed_at, last_accepted_at, opened_by
     FROM table_qr_sessions
     WHERE table_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tableId]
  ));
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    table_id: Number(row.table_id),
    opened_at: row.opened_at as Date | string,
    expires_at: row.expires_at as Date | string,
    closed_at: (row.closed_at as Date | string | null) ?? null,
    last_accepted_at: (row.last_accepted_at as Date | string | null) ?? null,
    opened_by: String(row.opened_by || 'qr'),
  };
}

async function insertSession(tableId: number, openedBy: 'qr' | 'staff') {
  const expiresAt = minutesFromNow(SESSION_MINUTES);
  await executeQuery(
    `INSERT INTO table_qr_sessions (table_id, expires_at, opened_by)
     VALUES (?, ?, ?)`,
    [tableId, expiresAt, openedBy]
  );
  qrSessionCacheBust();
}

export async function openQrSession(tableId: number, openedBy: 'qr' | 'staff' = 'staff') {
  const open = await getOpenQrSession(tableId);
  if (open) {
    await executeQuery(
      'UPDATE table_qr_sessions SET expires_at = ?, opened_by = ? WHERE id = ?',
      [minutesFromNow(SESSION_MINUTES), openedBy, open.id]
    );
    qrSessionCacheBust();
    return;
  }
  await insertSession(tableId, openedBy);
}

export async function closeQrSessionForTable(tableId: number | null | undefined) {
  if (!tableId) return;
  await ensureSchema();
  await executeQuery(
    'UPDATE table_qr_sessions SET closed_at = NOW() WHERE table_id = ? AND closed_at IS NULL',
    [tableId]
  );
  qrSessionCacheBust();
}

export async function closeQrSessionForOrder(orderId: string) {
  const rows = sqlRows(await executeQuery(
    'SELECT table_id FROM orders WHERE id = ? LIMIT 1',
    [orderId]
  ));
  const tableId = rows[0]?.table_id == null ? null : Number(rows[0].table_id);
  if (!tableId) return;
  const others = sqlRows(await executeQuery(
    `SELECT id FROM orders
     WHERE table_id = ? AND id != ? AND order_type = 'DINE_IN' AND status NOT IN ('served', 'cancelled')
     LIMIT 1`,
    [tableId, orderId]
  ));
  if (others.length > 0) return;
  await closeQrSessionForTable(tableId);
}

export async function markQrSessionAccepted(tableId: number | null | undefined) {
  if (!tableId) return;
  const open = await getOpenQrSession(tableId);
  if (!open) {
    await insertSession(tableId, 'staff');
    return;
  }
  await executeQuery(
    'UPDATE table_qr_sessions SET last_accepted_at = NOW(), expires_at = ? WHERE id = ?',
    [minutesFromNow(SESSION_MINUTES), open.id]
  );
  qrSessionCacheBust();
}

export async function markQrSessionAcceptedForOrder(orderId: string) {
  const rows = sqlRows(await executeQuery(
    'SELECT table_id FROM orders WHERE id = ? LIMIT 1',
    [orderId]
  ));
  const tableId = rows[0]?.table_id == null ? null : Number(rows[0].table_id);
  await markQrSessionAccepted(tableId);
}

async function pendingCount(tableId: number) {
  const rows = sqlRows(await executeQuery(
    `SELECT COUNT(*) AS count
     FROM orders
     WHERE table_id = ? AND status = 'pending' AND order_type = 'DINE_IN'`,
    [tableId]
  ));
  return Number(rows[0]?.count || 0);
}

export type CatalogDineInDecision =
  | { ok: true; status: 'pending' | 'preparing' }
  | { ok: false; error: string; code: 'TABLE_QR_CLOSED' | 'WAIT_FOR_STAFF' };

export async function decideCatalogDineInOrder(tableId: number): Promise<CatalogDineInDecision> {
  try {
    const open = await getOpenQrSession(tableId);
    if (open) {
      if (!open.last_accepted_at) {
        if ((await pendingCount(tableId)) >= 2) {
          return { ok: false, error: QR_WAIT_STAFF_MESSAGE, code: 'WAIT_FOR_STAFF' };
        }
        return { ok: true, status: 'pending' };
      }
      const lastAccepted = asDate(open.last_accepted_at);
      const gapMs = lastAccepted ? Date.now() - lastAccepted.getTime() : GAP_MINUTES * 60_000 + 1;
      if (gapMs > GAP_MINUTES * 60_000) {
        return { ok: true, status: 'pending' };
      }
      return { ok: true, status: 'preparing' };
    }

    const last = await latestSession(tableId);
    const endedAt = last ? asDate(last.closed_at) || asDate(last.expires_at) : null;
    if (endedAt && Date.now() - endedAt.getTime() < REOPEN_COOLDOWN_MINUTES * 60_000) {
      return { ok: false, error: QR_SESSION_CLOSED_MESSAGE, code: 'TABLE_QR_CLOSED' };
    }

    await insertSession(tableId, 'qr');
    return { ok: true, status: 'pending' };
  } catch (error) {
    console.error('[qr-session] decide failed, requiring staff accept', error);
    return { ok: true, status: 'pending' };
  }
}

export async function tableHasOpenQrSession(tableId: number) {
  return Boolean(await getOpenQrSession(tableId));
}

export { SESSION_MINUTES, GAP_MINUTES };
