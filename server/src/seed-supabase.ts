/**
 * Seed Supabase from local db.json.
 *
 * Usage (from server/ dir):
 *   npx tsx src/seed-supabase.ts
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server/ before reading env vars
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in server/.env first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const dbPath = path.resolve(__dirname, '../data/db.json');
if (!fs.existsSync(dbPath)) {
  console.error(`No db.json found at ${dbPath}`);
  process.exit(1);
}

const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

async function seed() {
  // ── Users ──────────────────────────────────────
  console.log(`Seeding ${dbData.users.length} user(s)...`);
  for (const u of dbData.users) {
    const { error } = await supabase.from('users').upsert({
      id: u.id,
      email: u.email,
      password_hash: u.passwordHash,
      created_at: u.createdAt,
    }, { onConflict: 'id' });
    if (error) console.error('  user error:', error.message);
  }

  // ── Products (dedupe by SKU, keep latest) ──────
  const skuMap = new Map<string, any>();
  for (const p of dbData.products) {
    skuMap.set(p.sku, p);
  }
  const uniqueProducts = [...skuMap.values()];

  console.log(`Seeding ${uniqueProducts.length} unique product(s) (from ${dbData.products.length} total)...`);
  for (const p of uniqueProducts) {
    const { error } = await supabase.from('products').upsert({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      low_stock_threshold: p.lowStockThreshold,
      weight_kg: p.weightKg ?? null,
      length_cm: p.lengthCm ?? null,
      width_cm: p.widthCm ?? null,
      height_cm: p.heightCm ?? null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }, { onConflict: 'sku' });
    if (error) console.error('  product error:', error.message);
  }

  // ── Orders ─────────────────────────────────────
  console.log(`Seeding ${dbData.orders.length} order(s)...`);
  for (const o of dbData.orders) {
    const { error } = await supabase.from('orders').upsert({
      id: o.id,
      reference: o.reference,
      items: o.items,
      status: o.status,
      created_at: o.createdAt,
    }, { onConflict: 'id' });
    if (error) console.error('  order error:', error.message);
  }

  console.log('Done! Database seeded successfully.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
