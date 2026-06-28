-- ============================================================
-- 🗑️ REMOVE PRODUCTS & CUSTOMERS TABLES
-- ============================================================
-- Migration: Hapus tabel produk, pelanggan, dan semua relasinya
-- Invoice tetap ada, hanya FK ke customers diubah ke TEXT field
-- Transaksi: customer_id jadi TEXT, hapus product_id & custom_product_name
-- ============================================================

-- 1. Lepas FK transactions → customers
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

-- 2. Ubah customer_id dari UUID → TEXT (bebas, nama pelanggan)
ALTER TABLE transactions ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN customer_id TYPE TEXT USING customer_id::TEXT;
ALTER TABLE transactions RENAME COLUMN customer_id TO customer_name;

-- 3. Lepas FK transactions → products, hapus kolom produk
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_product_id_fkey;
ALTER TABLE transactions DROP COLUMN IF EXISTS product_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS custom_product_name;

-- 4. Lepas FK invoices → customers, ubah ke TEXT field
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE invoices ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN customer_id TYPE TEXT USING customer_id::TEXT;
ALTER TABLE invoices RENAME COLUMN customer_id TO customer_name;

-- 5. Drop tabel yang tidak dipakai
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 6. Update seed data — hapus data customer & produk (sudah aman karena CASCADE)