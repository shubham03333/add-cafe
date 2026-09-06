import { createHash } from 'crypto';
import { executeQuery } from '@/lib/db';
import { cache } from '@/lib/cache';
import { sqlRows, type SqlRow } from '@/lib/sql-rows';
import { isOutOfStockToday } from '@/lib/daily-stockout';
import { getTodayDateString } from '@/lib/timezone-dynamic';

const INTEGRATION_MENU_TTL = 60;

function isUnknownColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR');
}

export type IntegrationMenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  is_available: boolean;
  position: number | null;
  image_url: string | null;
  updated_at: string | null;
  out_of_stock: boolean;
};

function mapRow(row: SqlRow, today: string): IntegrationMenuItem {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    price: Number(row.price),
    category: row.category == null ? null : String(row.category),
    is_available: Boolean(row.is_available),
    position: row.position == null ? null : Number(row.position),
    image_url: row.image_url == null ? null : String(row.image_url),
    updated_at: row.updated_at ? String(row.updated_at) : row.created_at ? String(row.created_at) : null,
    out_of_stock: isOutOfStockToday(row.stockout_date, today),
  };
}

async function queryMenu(includeUnavailable: boolean, since?: string) {
  const today = await getTodayDateString();
  const params: unknown[] = [];
  let where = 'WHERE 1=1';
  if (!includeUnavailable) {
    where += ' AND is_available = 1';
  }
  if (since) {
    where += ' AND COALESCE(updated_at, created_at) > ?';
    params.push(since);
  }

  const extraQuery = `
    SELECT id, name, description, price, category, is_available, position, image_url, stockout_date,
           COALESCE(updated_at, created_at) AS updated_at
    FROM menu_items
    ${where}
    ORDER BY position ASC, id ASC
  `;
  const baseQuery = `
    SELECT id, name, price, category, is_available, position, created_at
    FROM menu_items
    ${since ? where.replace('AND COALESCE(updated_at, created_at) > ?', 'AND created_at > ?') : where}
    ORDER BY position ASC, id ASC
  `;

  try {
    const rows = sqlRows(await executeQuery(extraQuery, params));
    return rows.map((row) => mapRow(row, today));
  } catch (error) {
    if (!isUnknownColumn(error)) throw error;
    const rows = sqlRows(await executeQuery(baseQuery, params));
    return rows.map((row) => mapRow(row, today));
  }
}

export function menuContentHash(items: IntegrationMenuItem[]) {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex').slice(0, 16);
}

export async function getIntegrationMenu(includeUnavailable: boolean) {
  const cacheKey = `integration_menu_${includeUnavailable ? 'all' : 'available'}`;
  const cached = cache.get<{ items: IntegrationMenuItem[]; content_hash: string; synced_at: string }>(cacheKey);
  if (cached) return cached;

  const items = await queryMenu(includeUnavailable);
  const payload = {
    items,
    content_hash: menuContentHash(items),
    synced_at: new Date().toISOString(),
  };
  cache.set(cacheKey, payload, INTEGRATION_MENU_TTL);
  return payload;
}

export async function getIntegrationMenuDelta(since: string, includeUnavailable: boolean) {
  const items = await queryMenu(includeUnavailable, since);
  return {
    items,
    content_hash: menuContentHash(items),
    synced_at: new Date().toISOString(),
    since,
  };
}
