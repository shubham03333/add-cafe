import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOffer,
  lineGross,
  normalizeOfferCode,
  normalizeOfferPhone,
  roundMoney,
} from './offer-calc';

const items = [
  { id: 1, price: 200, quantity: 2 },
  { id: 2, price: 100, quantity: 1 },
];

test('roundMoney uses paise', () => {
  assert.equal(roundMoney(10.125), 10.13);
  assert.equal(lineGross(items), 500);
});

test('bill percent discount', () => {
  const result = applyOffer(items, {
    code: 'BDAY10',
    name: 'Birthday',
    scope: 'bill',
    discount_type: 'percent',
    discount_value: 10,
    menu_item_ids: null,
    min_bill: 0,
    is_active: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.gross, 500);
  assert.equal(result.discount, 50);
  assert.equal(result.net, 450);
});

test('dish percent only hits matching lines', () => {
  const result = applyOffer(items, {
    code: 'COFFEE20',
    name: 'Coffee',
    scope: 'dish',
    discount_type: 'percent',
    discount_value: 20,
    menu_item_ids: [2],
    min_bill: 0,
    is_active: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.discount, 20);
  assert.equal(result.net, 480);
});

test('fixed discount cannot exceed eligible', () => {
  const result = applyOffer(items, {
    code: 'FLAT999',
    name: 'Flat',
    scope: 'bill',
    discount_type: 'fixed',
    discount_value: 999,
    menu_item_ids: null,
    min_bill: 0,
    is_active: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.discount, 500);
  assert.equal(result.net, 0);
});

test('min bill and inactive offers fail closed', () => {
  const min = applyOffer(items, {
    code: 'BIG',
    name: 'Big',
    scope: 'bill',
    discount_type: 'percent',
    discount_value: 10,
    menu_item_ids: null,
    min_bill: 999,
    is_active: true,
  });
  assert.equal(min.ok, false);
  const dead = applyOffer(items, {
    code: 'OLD',
    name: 'Old',
    scope: 'bill',
    discount_type: 'percent',
    discount_value: 10,
    menu_item_ids: null,
    min_bill: 0,
    is_active: false,
  });
  assert.equal(dead.ok, false);
});

test('normalize code and phone', () => {
  assert.equal(normalizeOfferCode(' bday 10 '), 'BDAY10');
  assert.equal(normalizeOfferPhone('+91 98765 43210'), '9876543210');
});
