const { executeQuery } = require('../src/lib/db');

async function checkTablesStatus() {
  try {
    console.log('Checking tables status in database...');

    // Get all tables (active and inactive)
    const allTables = await executeQuery('SELECT id, table_code, table_name, capacity, is_active FROM tables_master ORDER BY id');

    console.log(`\nTotal tables in database: ${allTables.length}`);
    console.log('\nAll tables:');
    allTables.forEach(table => {
      console.log(`ID: ${table.id}, Code: ${table.table_code}, Name: ${table.table_name}, Active: ${table.is_active}`);
    });

    // Get active tables (what the API returns)
    const activeTables = allTables.filter(table => table.is_active === 1);
    console.log(`\nActive tables (shown in UI): ${activeTables.length}`);
    activeTables.forEach(table => {
      console.log(`ID: ${table.id}, Code: ${table.table_code}, Name: ${table.table_name}`);
    });

    // Get inactive tables
    const inactiveTables = allTables.filter(table => table.is_active === 0);
    console.log(`\nInactive tables (hidden from UI): ${inactiveTables.length}`);
    inactiveTables.forEach(table => {
      console.log(`ID: ${table.id}, Code: ${table.table_code}, Name: ${table.table_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTablesStatus();
