import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { store } from './db/store.js';
import { seedIfEmpty } from './db/seed.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { shippingRouter } from './routes/shipping.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/calculate-shipping', shippingRouter);

  app.use(errorHandler);
  return app;
}

async function main() {
  store.load();
  await seedIfEmpty();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    console.log(`Demo login → demo@example.com / password123`);
  });
}

// Only auto-start when run directly (not when imported by tests).
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
