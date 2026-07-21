// -----------------------------------------------------------------------------
// Storage layer.
//
// This is a small in-memory store backed by a JSON file so the app runs with
// ZERO external services or native build steps (no Mongo/Postgres/SQLite to
// install). The public interface is deliberately repository-shaped: swapping in
// Mongoose or Prisma later means reimplementing this one file, nothing else.
//
// CONCURRENCY NOTE (relevant to Tier 2):
// Node executes JavaScript on a single thread. Any method here that does not
// `await` between reading and writing runs as an uninterruptible critical
// section, so two overlapping requests cannot interleave mid-update. That is
// what makes `decrementStockIfAvailable` a correct atomic guard — it mirrors
// the Mongo `findOneAndUpdate({ quantity: { $gte } })` pattern from the brief.
// -----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Order, Product, User } from '@shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
// The data file location is overridable, and persistence can be turned off
// entirely (tests set STOCKROOM_PERSIST=off so they never touch the app's file).
const DATA_FILE = process.env.STOCKROOM_DATA_FILE ?? path.join(DATA_DIR, 'db.json');

interface DbShape {
  // users hold a passwordHash which never leaves the store as-is.
  users: (User & { passwordHash: string })[];
  products: Product[];
  orders: Order[];
}

const empty: DbShape = { users: [], products: [], orders: [] };

class Store {
  private data: DbShape = empty;

  load(): void {
    if (fs.existsSync(DATA_FILE)) {
      try {
        this.data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DbShape;
        // Defensive: ensure all collections exist.
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
    if (process.env.STOCKROOM_PERSIST === 'off') return; // in-memory only (tests)
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
  }

  // Test/seed helper: wipe everything.
  reset(): void {
    this.data = structuredClone(empty);
    this.persist();
  }

  // ---- Users ----
  findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email === normalized);
  }

  createUser(email: string, passwordHash: string): User {
    const record = {
      id: randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(record);
    this.persist();
    return this.toPublicUser(record);
  }

  findUserById(id: string): User | undefined {
    const u = this.data.users.find((x) => x.id === id);
    return u ? this.toPublicUser(u) : undefined;
  }

  private toPublicUser(u: User & { passwordHash: string }): User {
    return { id: u.id, email: u.email, createdAt: u.createdAt };
  }

  // ---- Products ----
  listProducts(): Product[] {
    return [...this.data.products].sort((a, b) => a.name.localeCompare(b.name));
  }

  findProductBySku(sku: string): Product | undefined {
    return this.data.products.find((p) => p.sku === sku);
  }

  createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const now = new Date().toISOString();
    const product: Product = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.data.products.push(product);
    this.persist();
    return product;
  }

  updateProduct(sku: string, patch: Partial<Omit<Product, 'id' | 'sku' | 'createdAt'>>): Product | undefined {
    const product = this.findProductBySku(sku);
    if (!product) return undefined;
    Object.assign(product, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return product;
  }

  deleteProduct(sku: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.sku !== sku);
    const removed = this.data.products.length < before;
    if (removed) this.persist();
    return removed;
  }

  /**
   * Atomically deduct `qty` from a product's stock, but ONLY if enough is
   * available. Returns the quantity actually deducted (0 if the guard failed or
   * the product is missing). Synchronous by design — see the concurrency note
   * at the top of this file.
   */
  decrementStockIfAvailable(sku: string, qty: number): number {
    if (qty <= 0) return 0;
    const product = this.findProductBySku(sku);
    if (!product) return 0;
    if (product.quantity < qty) return 0; // guard: never oversell
    product.quantity -= qty;
    product.updatedAt = new Date().toISOString();
    // Note: persistence deferred to the caller so a whole multi-line order
    // commits as one write (see `commit`).
    return qty;
  }

  // ---- Orders ----
  listOrders(): Order[] {
    return [...this.data.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  addOrder(order: Order): Order {
    this.data.orders.push(order);
    this.persist();
    return order;
  }

  // Force a synchronous flush (used after a batch of decrements).
  commit(): void {
    this.persist();
  }

  newId(): string {
    return randomUUID();
  }
}

export const store = new Store();
