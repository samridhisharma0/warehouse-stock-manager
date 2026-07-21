import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Tests run entirely in memory so they never write to the app's db.json.
process.env.STOCKROOM_PERSIST = 'off';

import { store } from '../db/store.js';
import { processOrder } from '../logic/fulfillment.js';

beforeEach(() => {
  store.reset();
  store.createProduct({ sku: 'A1', name: 'Widget', category: 'x', quantity: 10, lowStockThreshold: 0 });
  store.createProduct({ sku: 'B2', name: 'Gadget', category: 'x', quantity: 5, lowStockThreshold: 0 });
});

test('fully fulfils when stock is sufficient', () => {
  const order = processOrder({ items: [{ sku: 'A1', quantity: 4 }] });
  assert.equal(order.status, 'Fulfilled');
  assert.equal(order.items[0].fulfilledQty, 4);
  assert.equal(order.items[0].backorderedQty, 0);
  assert.equal(store.findProductBySku('A1')!.quantity, 6);
});

test('partially fulfils and backorders the remainder', () => {
  const order = processOrder({ items: [{ sku: 'B2', quantity: 8 }] });
  assert.equal(order.status, 'Partially Fulfilled');
  assert.equal(order.items[0].fulfilledQty, 5);
  assert.equal(order.items[0].backorderedQty, 3);
  assert.equal(store.findProductBySku('B2')!.quantity, 0);
});

test('mixed multi-line order derives the right status', () => {
  const order = processOrder({ items: [{ sku: 'A1', quantity: 2 }, { sku: 'B2', quantity: 99 }] });
  assert.equal(order.status, 'Partially Fulfilled');
});

test('rejects unknown SKUs before touching any stock', () => {
  assert.throws(() => processOrder({ items: [{ sku: 'A1', quantity: 1 }, { sku: 'NOPE', quantity: 1 }] }));
  assert.equal(store.findProductBySku('A1')!.quantity, 10); // untouched
});

test('never oversells under a burst of concurrent orders', async () => {
  // 20 orders for 1 unit each against 10 in stock: exactly 10 should succeed.
  const results = await Promise.all(
    Array.from({ length: 20 }, () => Promise.resolve().then(() => processOrder({ items: [{ sku: 'A1', quantity: 1 }] }))),
  );
  const totalFulfilled = results.reduce((sum, o) => sum + o.items[0].fulfilledQty, 0);
  assert.equal(totalFulfilled, 10);
  assert.equal(store.findProductBySku('A1')!.quantity, 0);
  assert.ok(store.findProductBySku('A1')!.quantity >= 0); // never negative
});
