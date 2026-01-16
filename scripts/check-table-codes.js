const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_orders'
  });

  const [rows] = await connection.execute('SELECT id, table_code, table_name FROM tables_master WHERE is_active = 1 ORDER BY id');
  console.log('Current tables:');
  rows.forEach(row => console.log(`ID: ${row.id}, Code: '${row.table_code}', Name: '${row.table_name}'`));

  await connection.end();
}

checkTables().catch(console.error);
