// -----------------------------------------------------------------------------
// Storage layer.
//
// When SUPABASE_URL + SUPABASE_SERVICE_KEY env vars are set, uses Supabase
// Postgres (production). Otherwise falls back to the JSON-file store (local dev).
//
// The public interface is identical either way — all callers (routes, logic,
// tests) import `store` and use the same methods.
// -----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Order, Product, User } from '@shared/types';

// ---------------------------------------------------------------------------
// Supabase client (lazy-initialized only when env vars exist)
// ---------------------------------------------------------------------------
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _sb: SupabaseClient | null = null;
let _sbChecked = false;

function sb(): SupabaseClient | null {
  if (_sbChecked) return _sb;
  _sbChecked = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key);
  return _sb;
}

// ---------------------------------------------------------------------------
// snake_case ↔ camelCase mapping helpers
// ---------------------------------------------------------------------------

/** camelCase → snake_case for Supabase inserts/updates */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const sk = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[sk] = v;
  }
  return out;
}

/** snake_case → camelCase from Supabase rows */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSON-file fallback (local dev, tests)
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = process.env.STOCKROOM_DATA_FILE ?? path.join(DATA_DIR, 'db.json');

interface DbShape {
  users: (User & { passwordHash: string })[];
  products: Product[];
  orders: Order[];
}

const empty: DbShape = { users: [], products: [], orders: [] };

// ---------------------------------------------------------------------------
// Store — delegates to Supabase when available, otherwise JSON file
// ---------------------------------------------------------------------------
class Store {
  private data: DbShape = structuredClone(empty);

  // ---- Lifecycle ----

  load(): void {
    if (sb()) return; // Supabase mode: no file loading needed.
    if (fs.existsSync(DATA_FILE)) {
      try {
        this.data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DbShape;
        this.data.users ??= [];
        this.data.products ??= [];
        this.data.orders ??= [];
      } catch {
        this.data = structuredClone(empty);
      }
    } else {
      this.data = structuredClone(empty);
    }
  }

  private persist(): void {
    if (sb()) return; // Supabase writes happen inline.
    if (process.env.STOCKROOM_PERSIST === 'off') return;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
  }

  reset(): void {
    this.data = structuredClone(empty);
    this.persist();
  }

  // ---- Users ----

  async findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    if (sb()) {
      const { data } = await sb()!.from('users').select('*').eq('email', normalized).single();
      if (!data) return undefined;
      const row = toCamelCase(data) as User & { passwordHash: string };
      return row;
    }
    return this.data.users.find((u) => u.email === normalized);
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const record = {
      id: randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    if (sb()) {
      await sb()!.from('users').insert(toSnakeCase(record));
      return { id: record.id, email: record.email, createdAt: record.createdAt };
    }
    this.data.users.push(record);
    this.persist();
    return this.toPublicUser(record);
  }

  async findUserById(id: string): Promise<User | undefined> {
    if (sb()) {
      const { data } = await sb()!.from('users').select('*').eq('id', id).single();
      if (!data) return undefined;
      const row = toCamelCase(data);
      return { id: row.id as string, email: row.email as string, createdAt: row.createdAt as string };
    }
    const u = this.data.users.find((x) => x.id === id);
    return u ? this.toPublicUser(u) : undefined;
  }

  private toPublicUser(u: User & { passwordHash: string }): User {
    return { id: u.id, email: u.email, createdAt: u.createdAt };
  }

  // ---- Products ----

  async listProducts(): Promise<Product[]> {
    if (sb()) {
      const { data } = await sb()!.from('products').select('*').order('name');
      if (!data) return [];
      return data.map((row) => toCamelCase(row)) as unknown as Product[];
    }
    const seen = new Set<string>();
    const unique = this.data.products.filter((p) => {
      if (seen.has(p.sku)) return false;
      seen.add(p.sku);
      return true;
    });
    return [...unique].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findProductBySku(sku: string): Promise<Product | undefined> {
    if (sb()) {
      const { data } = await sb()!.from('products').select('*').eq('sku', sku).single();
      if (!data) return undefined;
      return toCamelCase(data) as unknown as Product;
    }
    return this.data.products.find((p) => p.sku === sku);
  }

  async createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    if (sb()) {
      await sb()!.from('products').insert(toSnakeCase(product as unknown as Record<string, unknown>));
      return product;
    }
    this.data.products.push(product);
    this.persist();
    return product;
  }

  async updateProduct(sku: string, patch: Partial<Omit<Product, 'id' | 'sku' | 'createdAt'>>): Promise<Product | undefined> {
    const product = await this.findProductBySku(sku);
    if (!product) return undefined;
    const updated = { ...product, ...patch, updatedAt: new Date().toISOString() };
    if (sb()) {
      const snakePatch = toSnakeCase(updated as unknown as Record<string, unknown>);
      await sb()!.from('products').update(snakePatch).eq('sku', sku);
      return updated;
    }
    Object.assign(product, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return product;
  }

  async deleteProduct(sku: string): Promise<boolean> {
    if (sb()) {
      const { count } = await sb()!.from('products').delete().eq('sku', sku);
      return (count ?? 0) > 0;
    }
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.sku !== sku);
    const removed = this.data.products.length < before;
    if (removed) this.persist();
    return removed;
  }

  /**
   * Atomically deduct stock via Supabase RPC (server-side Postgres function)
   * or the in-memory guard for the JSON-file store.
   */
  async decrementStockIfAvailable(sku: string, qty: number): Promise<number> {
    if (qty <= 0) return 0;
    if (sb()) {
      const { data } = await sb()!.rpc('decrement_stock', { p_sku: sku, p_qty: qty });
      return Number(data ?? 0);
    }
    const product = this.data.products.find((p) => p.sku === sku);
    if (!product) return 0;
    if (product.quantity < qty) return 0;
    product.quantity -= qty;
    product.updatedAt = new Date().toISOString();
    return qty;
  }

  // ---- Orders ----

  async listOrders(): Promise<Order[]> {
    if (sb()) {
      const { data } = await sb()!.from('orders').select('*').order('created_at', { ascending: false });
      if (!data) return [];
      return data.map((row) => toCamelCase(row)) as unknown as Order[];
    }
    return [...this.data.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async addOrder(order: Order): Promise<Order> {
    if (sb()) {
      await sb()!.from('orders').insert(toSnakeCase(order as unknown as Record<string, unknown>));
      return order;
    }
    this.data.orders.push(order);
    this.persist();
    return order;
  }

  commit(): void {
    this.persist();
  }

  newId(): string {
    return randomUUID();
  }
}

export const store = new Store();
