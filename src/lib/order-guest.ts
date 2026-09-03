import { executeQuery } from '@/lib/db';

let schemaReady = false;

export function sanitizeGuestName(value: unknown) {
  return String(value || '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function sanitizeGuestPhone(value: unknown) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 15);
}

export async function ensureOrderGuestColumns() {
  if (schemaReady) return;
  try {
    await executeQuery('SELECT customer_name, customer_phone FROM orders LIMIT 0');
    schemaReady = true;
    return;
  } catch {
    // columns missing — add them
  }
  const add = async (sql: string) => {
    try {
      await executeQuery(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Duplicate column')) {
        console.warn('[orders] guest column migrate skipped', message);
      }
    }
  };
  await add('ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100) NULL');
  await add('ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(15) NULL');
  schemaReady = true;
}
