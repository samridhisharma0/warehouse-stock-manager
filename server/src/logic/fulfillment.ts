import type { CreateOrderRequest, Order, OrderLine, OrderStatus } from '@shared/types';
import { store } from '../db/store.js';
import { HttpError } from '../middleware/error.js';

function orderReference(): string {
  return 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function deriveStatus(lines: OrderLine[]): OrderStatus {
  const anyFulfilled = lines.some((l) => l.fulfilledQty > 0);
  const anyBackordered = lines.some((l) => l.backorderedQty > 0);
  if (anyFulfilled && !anyBackordered) return 'Fulfilled';
  if (anyFulfilled && anyBackordered) return 'Partially Fulfilled';
  return 'Pending';
}

/**
 * Process an order against live stock.
 *
 * With Supabase: each decrement_stock call is a Postgres RPC that runs inside
 * a single SQL statement — atomic by construction.
 *
 * With the JSON-file store: the synchronous critical section (no await between
 * read and decrement) prevents interleaving on Node's single thread.
 */
export async function processOrder(payload: CreateOrderRequest): Promise<Order> {
  if (!payload.items || payload.items.length === 0) {
    throw new HttpError(400, 'An order must contain at least one item.');
  }

  const merged = new Map<string, number>();
  for (const item of payload.items) {
    const sku = String(item.sku ?? '').trim();
    const qty = Number(item.quantity);
    if (!sku) throw new HttpError(400, 'Each order item needs a sku.');
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new HttpError(400, `Quantity for ${sku} must be a positive number.`);
    }
    merged.set(sku, (merged.get(sku) ?? 0) + qty);
  }

  for (const sku of merged.keys()) {
    if (!(await store.findProductBySku(sku))) {
      throw new HttpError(404, `Unknown product sku: ${sku}`);
    }
  }

  const lines: OrderLine[] = [];
  for (const [sku, requestedQty] of merged) {
    const product = (await store.findProductBySku(sku))!;
    const available = product.quantity;
    const fulfilledQty = Math.min(requestedQty, available);
    const deducted = await store.decrementStockIfAvailable(sku, fulfilledQty);
    lines.push({
      sku,
      name: product.name,
      requestedQty,
      fulfilledQty: deducted,
      backorderedQty: requestedQty - deducted,
    });
  }

  const order: Order = {
    id: store.newId(),
    reference: orderReference(),
    items: lines,
    status: deriveStatus(lines),
    createdAt: new Date().toISOString(),
  };

  await store.addOrder(order);
  return order;
}
