import type { Product } from '@shared/types';

export type StockLevel = 'ok' | 'warn' | 'danger';

// Classify a product's stock health relative to its low-stock threshold.
export function stockLevel(p: Product): StockLevel {
  if (p.quantity === 0) return 'danger';
  if (p.quantity <= p.lowStockThreshold) return 'warn';
  return 'ok';
}

export function stockLabel(level: StockLevel): string {
  return level === 'ok' ? 'In stock' : level === 'warn' ? 'Low stock' : 'Out of stock';
}

// Fill fraction for the stock-health bar (capped at 100%).
export function stockPct(p: Product): number {
  const ceiling = Math.max(p.lowStockThreshold * 2, p.quantity, 1);
  return Math.min(100, Math.round((p.quantity / ceiling) * 100));
}
