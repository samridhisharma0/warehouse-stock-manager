import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.STOCKROOM_PERSIST = 'off';

import { store } from '../db/store.js';
import { processOrder } from '../logic/fulfillment.js';

beforeEach(async () => {
  store.reset();
  await store.createProduct({ sku: 'A1', name: 'Widget', category: 'x', quantity: 10, lowStockThreshold: 0 });
  await store.createProduct({ sku: 'B2', name: 'Gadget', category: 'x', quantity: 5, lowStockThreshold: 0 });
});

test('fully fulfils when stock is sufficient', async () => {
  const order = await processOrder({ items: [{ sku: 'A1', quantity: 4 }] });
  assert.equal(order.status, 'Fulfilled');
  assert.equal(order.items[0].fulfilledQty, 4);
  assert.equal(order.items[0].backorderedQty, 0);
  const product = await store.findProductBySku('A1');
  assert.equal(product!.quantity, 6);
});

test('partially fulfils and backorders the remainder', async () => {
  const order = await processOrder({ items: [{ sku: 'B2', quantity: 8 }] });
  assert.equal(order.status, 'Partially Fulfilled');
  assert.equal(order.items[0].fulfilledQty, 5);
  assert.equal(order.items[0].backorderedQty, 3);
  const product = await store.findProductBySku('B2');
  assert.equal(product!.quantity, 0);
});

test('mixed multi-line order derives the right status', async () => {
  const order = await processOrder({ items: [{ sku: 'A1', quantity: 2 }, { sku: 'B2', quantity: 99 }] });
  assert.equal(order.status, 'Partially Fulfilled');
});

test('rejects unknown SKUs before touching any stock', async () => {
  await assert.rejects(() => processOrder({ items: [{ sku: 'A1', quantity: 1 }, { sku: 'NOPE', quantity: 1 }] }));
  const product = await store.findProductBySku('A1');
  assert.equal(product!.quantity, 10);
});

test('never oversells under a burst of concurrent orders', async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, () => processOrder({ items: [{ sku: 'A1', quantity: 1 }] })),
  );
  const totalFulfilled = results.reduce((sum, o) => sum + o.items[0].fulfilledQty, 0);
  assert.equal(totalFulfilled, 10);
  const product = await store.findProductBySku('A1');
  assert.equal(product!.quantity, 0);
  assert.ok(product!.quantity >= 0);
});
