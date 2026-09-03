#!/usr/bin/env node
/**
 * Manual smoke test for /api/integrations/* (does not hit staff /api/orders write path).
 *
 * Usage:
 *   POS_BASE_URL=http://localhost:3000 INTEGRATION_API_KEY=... node scripts/test-integration-api.js
 *
 * Optional live order create (writes to TiDB):
 *   TEST_CREATE_ORDER=1 TEST_TABLE_CODE=5 TEST_MENU_ITEM_ID=1 node scripts/test-integration-api.js
 */

const BASE_URL = (process.env.POS_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_KEY = process.env.INTEGRATION_API_KEY || '';

async function request(path, { method = 'GET', headers = {}, body, expectStatus } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const ok = expectStatus ? response.status === expectStatus : response.ok;
  const label = `${method} ${path} -> ${response.status}`;
  if (ok) console.log('OK ', label);
  else {
    console.error('FAIL', label, data);
    process.exitCode = 1;
  }
  return { status: response.status, data };
}

async function main() {
  if (!API_KEY) {
    console.error('INTEGRATION_API_KEY is required');
    process.exit(1);
  }

  console.log('Base URL:', BASE_URL);

  await request('/api/integrations/menu', { expectStatus: 401 });
  await request('/api/integrations/menu', {
    headers: { Authorization: 'Bearer wrong-key' },
    expectStatus: 401,
  });

  const auth = { Authorization: `Bearer ${API_KEY}` };
  const menu = await request('/api/integrations/menu', { headers: auth, expectStatus: 200 });
  const tables = await request('/api/integrations/tables', { headers: auth, expectStatus: 200 });
  await request('/api/integrations/menu?include_unavailable=true', { headers: auth, expectStatus: 200 });
  await request('/api/integrations/menu/delta?since=2000-01-01T00:00:00.000Z', { headers: auth, expectStatus: 200 });

  const staffOrders = await request('/api/orders?paginated=true&limit=1', { expectStatus: 200 });
  if (staffOrders.status === 200) {
    console.log('OK  staff GET /api/orders still reachable without integration key');
  }

  if (process.env.TEST_CREATE_ORDER === '1') {
    const itemId = Number(process.env.TEST_MENU_ITEM_ID || menu.data?.items?.[0]?.id);
    const tableCode = process.env.TEST_TABLE_CODE || tables.data?.tables?.[0]?.table_code;
    const menuItem = (menu.data?.items || []).find((item) => Number(item.id) === itemId);
    if (!menuItem || !tableCode) {
      console.error('Cannot create test order: missing menu item or table');
      process.exitCode = 1;
      return;
    }
    const payload = {
      idempotency_key: `test-${Date.now()}`,
      source: 'digital_catalog',
      order_type: 'DINE_IN',
      table_code: String(tableCode),
      items: [{ id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 }],
      total: menuItem.price,
      customer_ref: 'integration-smoke-test',
    };
    const created = await request('/api/integrations/orders', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: payload,
      expectStatus: 201,
    });
    if (created.data?.id) {
      await request(`/api/integrations/orders/${created.data.id}`, { headers: auth, expectStatus: 200 });
      await request(
        `/api/integrations/orders/by-number?order_number=${created.data.order_number}`,
        { headers: auth, expectStatus: 200 }
      );
      await request('/api/integrations/orders', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: payload,
        expectStatus: 200,
      });
    }
  } else {
    console.log('Skip live order create (set TEST_CREATE_ORDER=1 to enable)');
  }

  if (process.exitCode) {
    console.error('\nIntegration smoke test failed');
    process.exit(process.exitCode);
  }
  console.log('\nIntegration smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
