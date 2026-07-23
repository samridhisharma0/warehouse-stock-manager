import { Router } from 'express';
import type { Product } from '@shared/types';
import { store } from '../db/store.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

export const productsRouter = Router();

productsRouter.use(requireAuth);

function parseNumber(value: unknown, field: string, { min }: { min?: number } = {}): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} must be a number.`);
  if (min !== undefined && n < min) throw new HttpError(400, `${field} cannot be less than ${min}.`);
  return n;
}

function readProductBody(body: any, { partial }: { partial: boolean }) {
  const out: Partial<Product> = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? '').trim();
    if (!name) throw new HttpError(400, 'Name is required.');
    out.name = name;
  }
  if (!partial || body.category !== undefined) {
    out.category = String(body.category ?? '').trim() || 'Uncategorised';
  }
  if (!partial || body.quantity !== undefined) {
    out.quantity = parseNumber(body.quantity, 'Quantity', { min: 0 });
  }
  if (!partial || body.lowStockThreshold !== undefined) {
    out.lowStockThreshold = parseNumber(body.lowStockThreshold ?? 0, 'Low-stock threshold', { min: 0 });
  }
  for (const field of ['weightKg', 'lengthCm', 'widthCm', 'heightCm'] as const) {
    if (body[field] !== undefined && body[field] !== '' && body[field] !== null) {
      out[field] = parseNumber(body[field], field, { min: 0 });
    }
  }
  return out;
}

productsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ products: await store.listProducts() });
  }),
);

productsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const sku = String(req.body?.sku ?? '').trim();
    if (!sku) throw new HttpError(400, 'SKU is required.');
    if (await store.findProductBySku(sku)) throw new HttpError(409, `A product with SKU "${sku}" already exists.`);

    const body = readProductBody(req.body, { partial: false });
    const product = await store.createProduct({
      sku,
      name: body.name!,
      category: body.category!,
      quantity: body.quantity!,
      lowStockThreshold: body.lowStockThreshold!,
      weightKg: body.weightKg,
      lengthCm: body.lengthCm,
      widthCm: body.widthCm,
      heightCm: body.heightCm,
    });
    res.status(201).json({ product });
  }),
);

productsRouter.put(
  '/:sku',
  asyncHandler(async (req, res) => {
    const { sku } = req.params;
    if (!await store.findProductBySku(sku)) throw new HttpError(404, `No product with SKU "${sku}".`);
    const patch = readProductBody(req.body, { partial: true });
    const product = await store.updateProduct(sku, patch);
    res.json({ product });
  }),
);

productsRouter.delete(
  '/:sku',
  asyncHandler(async (req, res) => {
    const removed = await store.deleteProduct(req.params.sku);
    if (!removed) throw new HttpError(404, `No product with SKU "${req.params.sku}".`);
    res.json({ ok: true });
  }),
);
