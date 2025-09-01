const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function compareDatabases() {
  console.log('🔍 Comparing Development and Production Databases...\n');

  // Development database config (from .env.local)
  const devConfig = {
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    user: process.env.DB_USERNAME || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  };

  // Production database config (you'll need to provide these)
  const prodConfig = {
    host: process.env.PROD_DB_HOST,
    user: process.env.PROD_DB_USERNAME,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    port: process.env.PROD_DB_PORT ? parseInt(process.env.PROD_DB_PORT) : 3306,
  };

  let devConnection = null;
  let prodConnection = null;

  try {
    console.log('📡 Connecting to Development Database...');
    devConnection = await mysql.createConnection(devConfig);
    console.log('✅ Development Database Connected\n');

    console.log('📡 Connecting to Production Database...');
    prodConnection = await mysql.createConnection(prodConfig);
    console.log('✅ Production Database Connected\n');

    // Compare orders table
    console.log('📊 Comparing Orders Tables...\n');

    // Get all orders from development
    const [devOrders] = await devConnection.execute(
      'SELECT id, order_number, status, payment_status, order_time, total FROM orders ORDER BY order_time DESC LIMIT 20'
    );

    // Get all orders from production
    const [prodOrders] = await prodConnection.execute(
      'SELECT id, order_number, status, payment_status, order_time, total FROM orders ORDER BY order_time DESC LIMIT 20'
    );

    console.log('🟢 DEVELOPMENT ORDERS (Last 20):');
    console.log('─'.repeat(80));
    if (devOrders.length === 0) {
      console.log('❌ No orders found in development database');
    } else {
      devOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.order_number} - Status: ${order.status} - Payment: ${order.payment_status} - Time: ${order.order_time}`);
      });
    }

    console.log('\n🔴 PRODUCTION ORDERS (Last 20):');
    console.log('─'.repeat(80));
    if (prodOrders.length === 0) {
      console.log('❌ No orders found in production database');
    } else {
      prodOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.order_number} - Status: ${order.status} - Payment: ${order.payment_status} - Time: ${order.order_time}`);
      });
    }

    // Compare order counts
    console.log('\n📈 ORDER COUNTS:');
    console.log(`Development: ${devOrders.length} orders`);
    console.log(`Production: ${prodOrders.length} orders`);

    // Check for status differences
    console.log('\n🔍 STATUS ANALYSIS:');

    const devStatuses = devOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const prodStatuses = prodOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    console.log('Development Status Distribution:');
    Object.entries(devStatuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} orders`);
    });

    console.log('\nProduction Status Distribution:');
    Object.entries(prodStatuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} orders`);
    });

    // Check for specific order numbers that might exist in both
    const devOrderNumbers = new Set(devOrders.map(o => o.order_number));
    const prodOrderNumbers = new Set(prodOrders.map(o => o.order_number));

    const commonOrders = [...devOrderNumbers].filter(num => prodOrderNumbers.has(num));

    if (commonOrders.length > 0) {
      console.log('\n🔄 COMMON ORDERS FOUND:');
      commonOrders.forEach(orderNum => {
        const devOrder = devOrders.find(o => o.order_number === orderNum);
        const prodOrder = prodOrders.find(o => o.order_number === orderNum);
        console.log(`Order #${orderNum}:`);
        console.log(`  Dev: Status=${devOrder.status}, Payment=${devOrder.payment_status}`);
        console.log(`  Prod: Status=${prodOrder.status}, Payment=${prodOrder.payment_status}`);
        if (devOrder.status !== prodOrder.status) {
          console.log(`  ⚠️  STATUS MISMATCH!`);
        }
      });
    }

    // Check table structure
    console.log('\n🏗️  TABLE STRUCTURE COMPARISON:');

    const [devTables] = await devConnection.execute('SHOW TABLES LIKE "orders"');
    const [prodTables] = await prodConnection.execute('SHOW TABLES LIKE "orders"');

    if (devTables.length === 0) {
      console.log('❌ Orders table not found in development database');
    } else {
      const [devColumns] = await devConnection.execute('DESCRIBE orders');
      console.log('Development Orders Table Columns:');
      devColumns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    }

    if (prodTables.length === 0) {
      console.log('❌ Orders table not found in production database');
    } else {
      const [prodColumns] = await prodConnection.execute('DESCRIBE orders');
      console.log('\nProduction Orders Table Columns:');
      prodColumns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during database comparison:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection Tips:');
      console.log('1. Check if database servers are running');
      console.log('2. Verify firewall settings allow connections');
      console.log('3. Ensure correct hostnames and ports');
      console.log('4. Check if SSL is required for production database');
    }

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Authentication Tips:');
      console.log('1. Verify database credentials');
      console.log('2. Check user permissions');
      console.log('3. Ensure user can connect from your IP');
    }
  } finally {
    if (devConnection) {
      await devConnection.end();
      console.log('\n✅ Development database connection closed');
    }
    if (prodConnection) {
      await prodConnection.end();
      console.log('✅ Production database connection closed');
    }
  }
}

// Run the comparison
compareDatabases().catch(console.error);
