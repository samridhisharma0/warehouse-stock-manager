-- ============================================================
-- Stockroom — Supabase migration (snake_case columns)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Products table
CREATE TABLE IF NOT EXISTS products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                  TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'Uncategorised',
  quantity             NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold  NUMERIC NOT NULL DEFAULT 0,
  weight_kg            NUMERIC,
  length_cm            NUMERIC,
  width_cm             NUMERIC,
  height_cm            NUMERIC,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference   TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'Pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Atomic stock decrement (prevents overselling)
CREATE OR REPLACE FUNCTION decrement_stock(p_sku TEXT, p_qty NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  current_qty NUMERIC;
BEGIN
  SELECT quantity INTO current_qty FROM products WHERE sku = p_sku;
  IF current_qty IS NULL OR current_qty < p_qty THEN
    RETURN 0;
  END IF;
  UPDATE products
    SET quantity = quantity - p_qty,
        updated_at = now()
    WHERE sku = p_sku;
  RETURN p_qty;
END;
$$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
