import type { CreateOrderRequest, Order, OrderLine, OrderStatus } from '@shared/types';
import { store } from '../db/store.js';
import { HttpError } from '../middleware/error.js';

// Human-friendly order reference, e.g. ORD-8F3K2Q.
function orderReference(): string {
  return 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function deriveStatus(lines: OrderLine[]): OrderStatus {
  const anyFulfilled = lines.some((l) => l.fulfilledQty > 0);
  const anyBackordered = lines.some((l) => l.backorderedQty > 0);
  if (anyFulfilled && !anyBackordered) return 'Fulfilled';
  if (anyFulfilled && anyBackordered) return 'Partially Fulfilled';
  return 'Pending'; // nothing could be fulfilled
}

/**
 * Process an order against live stock.
 *
 * Runs as a single synchronous critical section: for each line we attempt an
 * atomic guarded decrement (never dropping stock below zero), record how much
 * was fulfilled vs backordered, then commit all stock changes + the order in
 * one write. Because there is no `await` between the reads and writes, two
 * concurrent orders for the same SKU cannot both "win" the same unit — the
 * classic oversell race is impossible here.
 */
export function processOrder(payload: CreateOrderRequest): Order {
  if (!payload.items || payload.items.length === 0) {
    throw new HttpError(400, 'An order must contain at least one item.');
  }

  // Merge duplicate SKUs and validate up front.
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

  // Validate every SKU exists before touching stock (all-or-nothing validation).
  for (const sku of merged.keys()) {
    if (!store.findProductBySku(sku)) {
      throw new HttpError(404, `Unknown product sku: ${sku}`);
    }
  }

  const lines: OrderLine[] = [];
  for (const [sku, requestedQty] of merged) {
    const product = store.findProductBySku(sku)!;
    // Guarded atomic decrement: fulfil as much as stock allows.
    const available = product.quantity;
    const fulfilledQty = Math.min(requestedQty, available);
    const deducted = store.decrementStockIfAvailable(sku, fulfilledQty);
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

  store.addOrder(order); // persists order + the deducted stock in one flush
  return order;
}
