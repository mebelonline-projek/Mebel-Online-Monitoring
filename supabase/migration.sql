-- ============================================================
-- 🗄️ MIGRATION SQL — Mebel Online Monitoring
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor
-- Langkah: Supabase Dashboard → SQL Editor → Paste → Run
-- ============================================================

-- ============================================================
-- 1. TABEL: products (Katalog Produk)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price BIGINT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. TABEL: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. TABEL: transactions
--    ⚠️ PERUBAHAN: invoice_number DIHAPUS, diganti transaction_number
--    Format: TRX-YYYYMMDD-XXX (nomor transaksi internal)
--    Invoice adalah entitas TERPISAH (lihat tabel invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  custom_product_name TEXT,
  description TEXT,
  final_price BIGINT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('CASH', 'DP')),
  dp_amount BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DP' CHECK (status IN ('LUNAS', 'DP', 'MENUNGGU_PELUNASAN', 'BATAL')),
  void_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  void_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  void_at TIMESTAMPTZ
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. TABEL: transaction_payments (Riwayat Pembayaran)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('TUNAI', 'TRANSFER')),
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. TABEL: hpp_items (HPP per Transaksi)
-- ============================================================
CREATE TABLE IF NOT EXISTS hpp_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hpp_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. TABEL: operational_costs (Biaya Operasional)
-- ============================================================
CREATE TABLE IF NOT EXISTS operational_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('LISTRIK', 'GAJI', 'BAHAN_BAKU', 'SEWA', 'LAINNYA')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. TABEL: store_settings (Pengaturan Toko)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Mebel Online Monitoring',
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. TABEL: users (Profile tambahan untuk auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'KARYAWAN')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. TABEL: invoices (BARU — Invoice/Faktur terpisah dari transaksi)
--    Format: INV-YYYYMMDD-XXX
--    Invoice adalah OPSIONAL, dibuat manual oleh user
--    Bisa mencakup 1 atau BEBERAPA transaksi (via invoice_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'CANCELLED')),
  total_amount BIGINT NOT NULL DEFAULT 0,
  total_paid BIGINT NOT NULL DEFAULT 0,
  remaining_amount BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. TABEL: invoice_items (Relasi invoice ↔ transaksi)
--     Many-to-many: 1 invoice bisa punya banyak transaksi
--     ON DELETE CASCADE: hapus invoice → items ikut terhapus
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, transaction_id)
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 🔒 ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Fungsi helper: bypass RLS untuk insert profil user baru
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, auth'
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (user_id, user_email, user_name, user_role);
END;
$$;

-- Fungsi helper: cek role user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS: users
-- ============================================================
CREATE POLICY "Owner full access on users" ON users
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan read self on users" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- RLS: products
-- ============================================================
CREATE POLICY "Owner full access on products" ON products
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan read products" ON products
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: customers
-- ============================================================
CREATE POLICY "Owner full access on customers" ON customers
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan insert customers" ON customers
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan select customers" ON customers
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: transactions
-- ============================================================
CREATE POLICY "Owner full access on transactions" ON transactions
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select transactions" ON transactions
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert transactions" ON transactions
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan update transactions" ON transactions
  FOR UPDATE USING (get_user_role() = 'KARYAWAN')
  WITH CHECK (
    get_user_role() = 'KARYAWAN'
    AND status <> 'BATAL'
  );

-- ============================================================
-- RLS: transaction_payments
-- ============================================================
CREATE POLICY "Owner full access on transaction_payments" ON transaction_payments
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select payments" ON transaction_payments
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert payments" ON transaction_payments
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: hpp_items
-- ============================================================
CREATE POLICY "Owner full access on hpp_items" ON hpp_items
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan full access on hpp_items" ON hpp_items
  FOR ALL USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: operational_costs
-- ============================================================
CREATE POLICY "Owner full access on operational_costs" ON operational_costs
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select operational_costs" ON operational_costs
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert operational_costs" ON operational_costs
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: store_settings
-- ============================================================
CREATE POLICY "Owner full access on store_settings" ON store_settings
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select store_settings" ON store_settings
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: invoices
-- ============================================================
CREATE POLICY "Owner full access on invoices" ON invoices
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select invoices" ON invoices
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert invoices" ON invoices
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan update invoices" ON invoices
  FOR UPDATE USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- RLS: invoice_items
-- ============================================================
CREATE POLICY "Owner full access on invoice_items" ON invoice_items
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan all on invoice_items" ON invoice_items
  FOR ALL USING (get_user_role() = 'KARYAWAN');

-- ============================================================
-- 🔄 INSERT DEFAULT STORE SETTINGS
-- ============================================================
INSERT INTO store_settings (store_name, address, phone)
VALUES ('Mebel Online Monitoring', 'Jl. Contoh No. 123', '08123456789')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 📄 FUNCTION: Generate Transaction Number (TRX-YYYYMMDD-XXX)
--    Ini NOMOR TRANSAKSI INTERNAL, BUKAN nomor invoice!
-- ============================================================
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  seq_num INT;
  new_txn TEXT;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(transaction_number, '-', 3) AS INT)), 0) + 1
  INTO seq_num
  FROM transactions
  WHERE transaction_number LIKE 'TRX-' || today_date || '-%';
  
  new_txn := 'TRX-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_txn;
END;
$$;

-- 🔄 TRIGGER: Auto-set transaction_number on insert
CREATE OR REPLACE FUNCTION set_transaction_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_transaction_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_transaction_number
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_transaction_number();

-- ============================================================
-- 📄 FUNCTION: Generate Invoice Number (INV-YYYYMMDD-XXX)
--    Ini NOMOR INVOICE — hanya untuk tabel invoices
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  seq_num INT;
  new_inv TEXT;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || today_date || '-%';
  
  new_inv := 'INV-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_inv;
END;
$$;

-- 🔄 TRIGGER: Auto-set invoice_number on insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();