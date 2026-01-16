const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cafe_orders',
      port: process.env.DB_PORT || 3306
    });

    console.log('Checking tables in database...');
    const [rows] = await connection.execute('SELECT id, table_code, table_name, capacity, is_active FROM tables_master ORDER BY CAST(table_code AS UNSIGNED), table_code');

    console.log('Tables found:');
    rows.forEach(table => {
      console.log(`ID: ${table.id}, Code: ${table.table_code}, Name: ${table.table_name}, Active: ${table.is_active}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();
