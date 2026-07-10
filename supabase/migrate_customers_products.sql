-- ============================================================
-- MIGRASI: Restore customers + products (V3)
-- ============================================================
-- Jalankan di Supabase SQL Editor.
-- Transaksi tetap simpan customer_name/description sebagai snapshot.
-- FK opsional: ON DELETE SET NULL agar hapus master tidak rusak histori.
-- ============================================================

-- 1. Tabel customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 2. Tabel products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'LAINNYA',
  description TEXT,
  base_price BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. FK opsional di transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- 4. RLS customers
DROP POLICY IF EXISTS "Owner full access on customers" ON customers;
DROP POLICY IF EXISTS "Karyawan insert customers" ON customers;
DROP POLICY IF EXISTS "Karyawan select customers" ON customers;

CREATE POLICY "Owner full access on customers" ON customers
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select customers" ON customers
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert customers" ON customers
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

-- 5. RLS products
DROP POLICY IF EXISTS "Owner full access on products" ON products;
DROP POLICY IF EXISTS "Karyawan read products" ON products;

CREATE POLICY "Owner full access on products" ON products
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan read products" ON products
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

-- 6. Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
