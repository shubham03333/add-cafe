import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOutOfStockToday, stockoutDateValue } from './daily-stockout';

test('stockoutDateValue reads YYYY-MM-DD strings', () => {
  assert.equal(stockoutDateValue('2026-09-06'), '2026-09-06');
  assert.equal(stockoutDateValue('2026-09-06T18:30:00.000Z'), '2026-09-06');
  assert.equal(stockoutDateValue(null), null);
  assert.equal(stockoutDateValue(''), null);
});

test('isOutOfStockToday is only true on that cafe day', () => {
  assert.equal(isOutOfStockToday('2026-09-06', '2026-09-06'), true);
  assert.equal(isOutOfStockToday('2026-09-05', '2026-09-06'), false);
  assert.equal(isOutOfStockToday(null, '2026-09-06'), false);
});
