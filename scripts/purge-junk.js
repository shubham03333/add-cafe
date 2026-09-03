/**
 * Safe junk purge only. Does not delete served/paid orders or daily_sales.
 * Usage: npm run purge-junk
 */
require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');

function getConfig() {
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    user: process.env.DB_USERNAME || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    ssl:
      process.env.DB_SSL === 'true' ||
      String(process.env.DB_HOST || process.env.MYSQL_HOST || '').includes('tidbcloud.com')
        ? { minVersion: 'TLSv1.2' }
        : undefined,
  };
}

async function safeDelete(db, label, sql) {
  try {
    const [result] = await db.query(sql);
    const n = result?.affectedRows || 0;
    console.log(`  ${label}: ${n}`);
    return n;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("doesn't exist") ||
      message.includes('Unknown table') ||
      message.includes('Unknown column')
    ) {
      console.log(`  ${label}: skipped (table not present)`);
      return 0;
    }
    throw error;
  }
}

async function main() {
  const config = getConfig();
  if (!config.host || !config.user || !config.database) {
    throw new Error('Missing DB_HOST / DB_USERNAME / DB_NAME');
  }

  const db = await mysql.createConnection(config);
  console.log('Purging junk only (orders sales data is kept)...');

  await safeDelete(
    db,
    'cancelled orders > 7 days',
    `DELETE FROM orders WHERE status = 'cancelled' AND order_time < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  await safeDelete(
    db,
    'abandoned pending > 2 days',
    `DELETE FROM orders WHERE status = 'pending' AND (payment_status IS NULL OR payment_status <> 'paid') AND order_time < DATE_SUB(NOW(), INTERVAL 2 DAY)`
  );
  await safeDelete(
    db,
    'expired/used OTPs',
    `DELETE FROM customer_otps WHERE expires_at < NOW() OR (used = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`
  );
  await safeDelete(
    db,
    'idempotency > 7 days',
    `DELETE FROM integration_idempotency WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  await safeDelete(
    db,
    'closed QR sessions > 7 days',
    `DELETE FROM table_qr_sessions WHERE closed_at IS NOT NULL AND closed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  console.log('Clearing dish JSON on orders older than 1 year (rows and totals kept)...');
  let jsonCleared = 0;
  for (let i = 0; i < 20; i += 1) {
    const n = await safeDelete(
      db,
      'old order json batch',
      `UPDATE orders
       SET items = '[]'
       WHERE order_time < DATE_SUB(NOW(), INTERVAL 1 YEAR)
         AND status IN ('served', 'cancelled')
         AND items IS NOT NULL
         AND CAST(items AS CHAR) NOT IN ('[]', 'null', '')
       LIMIT 500`
    );
    jsonCleared += n;
    if (n < 500) break;
  }
  console.log(`  old order json total: ${jsonCleared}`);
  await db.end();
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
