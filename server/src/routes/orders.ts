import { Router } from 'express';
import { store } from '../db/store.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { processOrder } from '../logic/fulfillment.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

// GET /api/orders — most recent first.
ordersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ orders: store.listOrders() });
  }),
);

// POST /api/orders — fulfil against live stock (partial fulfillment + backorders).
ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const order = processOrder({ items: req.body?.items });
    res.status(201).json({ order });
  }),
);
