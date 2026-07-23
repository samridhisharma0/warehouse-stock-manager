import bcrypt from 'bcryptjs';
import { store } from './store.js';

export async function seedIfEmpty(): Promise<void> {
  const hasUsers = !!(await store.findUserByEmail('demo@example.com'));
  const hasProducts = (await store.listProducts()).length > 0;
  if (hasUsers && hasProducts) return;

  if (!hasUsers) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await store.createUser('demo@example.com', passwordHash);
  }

  if (!hasProducts) {
    const samples = [
      { sku: 'KEYB-01', name: 'Mechanical Keyboard', category: 'Peripherals', quantity: 40, lowStockThreshold: 10, weightKg: 1.1, lengthCm: 45, widthCm: 15, heightCm: 4 },
      { sku: 'MOUSE-01', name: 'Wireless Mouse', category: 'Peripherals', quantity: 8, lowStockThreshold: 15, weightKg: 0.1, lengthCm: 12, widthCm: 7, heightCm: 4 },
      { sku: 'MON-27', name: '27" 4K Monitor', category: 'Displays', quantity: 12, lowStockThreshold: 5, weightKg: 6.5, lengthCm: 65, widthCm: 20, heightCm: 45 },
      { sku: 'CHAIR-ERG', name: 'Ergonomic Chair', category: 'Furniture', quantity: 3, lowStockThreshold: 4, weightKg: 18, lengthCm: 70, widthCm: 70, heightCm: 120 },
      { sku: 'USB-C-2M', name: 'USB-C Cable 2m', category: 'Cables', quantity: 200, lowStockThreshold: 50, weightKg: 0.08, lengthCm: 15, widthCm: 10, heightCm: 3 },
    ];
    for (const s of samples) await store.createProduct(s);
  }
}
