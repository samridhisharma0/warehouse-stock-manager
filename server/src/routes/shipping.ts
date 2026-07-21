import { Router } from 'express';
import type { ShippingRequest } from '@shared/types';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateShipping } from '../logic/shipping.js';

export const shippingRouter = Router();

shippingRouter.use(requireAuth);

// POST /api/calculate-shipping
shippingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload: ShippingRequest = {
      destinationPincode: String(req.body?.destinationPincode ?? '').trim(),
      items: Array.isArray(req.body?.items) ? req.body.items : [],
    };
    try {
      const result = calculateShipping(payload);
      res.json(result);
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Invalid shipping request.');
    }
  }),
);
