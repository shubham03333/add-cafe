const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateRevenueForDate(targetDate, newRevenue) {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cafe_orders',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to database');

    // First, let's see current revenue for the date
    const [currentRows] = await connection.execute(
      `SELECT
        DATE_FORMAT(order_time, '%Y-%m-%d') as date,
        SUM(total) as current_revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE DATE(order_time) = ? AND payment_status = 'paid'`,
      [targetDate]
    );

    if (currentRows.length > 0) {
      console.log(`Current revenue for ${targetDate}: ₹${currentRows[0].current_revenue}`);
      console.log(`Order count: ${currentRows[0].order_count}`);
    }

    // Check if we have a manual override table, if not create it
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'revenue_overrides'"
    );

    if (tables.length === 0) {
      console.log('Creating revenue_overrides table...');
      await connection.execute(`
        CREATE TABLE revenue_overrides (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL,
          manual_revenue DECIMAL(10,2) NOT NULL,
          original_revenue DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_date (date)
        )
      `);
      console.log('revenue_overrides table created');
    }

    // Insert or update the manual revenue
    await connection.execute(`
      INSERT INTO revenue_overrides (date, manual_revenue, original_revenue)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        manual_revenue = VALUES(manual_revenue),
        updated_at = CURRENT_TIMESTAMP
    `, [targetDate, newRevenue, currentRows[0]?.current_revenue || 0]);

    console.log(`✅ Manual revenue for ${targetDate} updated to ₹${newRevenue}`);

  } catch (error) {
    console.error('Error updating revenue:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Usage: node scripts/update-revenue-manual.js 2025-04-09 3200
const targetDate = process.argv[2];
const newRevenue = parseFloat(process.argv[3]);

if (!targetDate || !newRevenue) {
  console.log('Usage: node scripts/update-revenue-manual.js <date YYYY-MM-DD> <revenue>');
  console.log('Example: node scripts/update-revenue-manual.js 2025-04-09 3200');
  process.exit(1);
}

updateRevenueForDate(targetDate, newRevenue);
