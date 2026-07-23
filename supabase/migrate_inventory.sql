-- ============================================================
-- MIGRASI: Inventori & Multi Gudang + role GUDANG
-- Jalankan di Supabase SQL Editor (setelah migration utama).
-- JANGAN ubah search_path get_user_role / generate_invoice_number.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Role GUDANG pada users
-- ------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 2. product_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner gudang categories all" ON public.product_categories;
DROP POLICY IF EXISTS "Karyawan read categories" ON public.product_categories;

CREATE POLICY "Owner gudang categories all" ON public.product_categories
  FOR ALL USING (get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (get_user_role() IN ('OWNER', 'GUDANG'));

CREATE POLICY "Karyawan read categories" ON public.product_categories
  FOR SELECT USING (get_user_role() IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 3. Extend products
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0);

-- RLS products: GUDANG full, KARYAWAN read
DROP POLICY IF EXISTS "Owner full access on products" ON public.products;
DROP POLICY IF EXISTS "Karyawan read products" ON public.products;
DROP POLICY IF EXISTS "Owner gudang products all" ON public.products;
DROP POLICY IF EXISTS "Karyawan read products v2" ON public.products;

CREATE POLICY "Owner gudang products all" ON public.products
  FOR ALL USING (get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (get_user_role() IN ('OWNER', 'GUDANG'));

CREATE POLICY "Karyawan read products v2" ON public.products
  FOR SELECT USING (get_user_role() IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 4. warehouses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sales_warehouse BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hanya satu gudang penjualan aktif
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_one_sales_idx
  ON public.warehouses (is_sales_warehouse)
  WHERE is_sales_warehouse = true AND is_active = true;

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner gudang warehouses all" ON public.warehouses;
DROP POLICY IF EXISTS "Karyawan read warehouses" ON public.warehouses;

CREATE POLICY "Owner gudang warehouses all" ON public.warehouses
  FOR ALL USING (get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (get_user_role() IN ('OWNER', 'GUDANG'));

CREATE POLICY "Karyawan read warehouses" ON public.warehouses
  FOR SELECT USING (get_user_role() IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 5. warehouse_stocks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_stocks (
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (warehouse_id, product_id)
);

ALTER TABLE public.warehouse_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner gudang stocks all" ON public.warehouse_stocks;
DROP POLICY IF EXISTS "Karyawan read stocks" ON public.warehouse_stocks;

CREATE POLICY "Owner gudang stocks all" ON public.warehouse_stocks
  FOR ALL USING (get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (get_user_role() IN ('OWNER', 'GUDANG'));

CREATE POLICY "Karyawan read stocks" ON public.warehouse_stocks
  FOR SELECT USING (get_user_role() IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 6. stock_movements
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER', 'SALE', 'VOID_RESTORE')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created
  ON public.stock_movements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ref
  ON public.stock_movements (reference_type, reference_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner gudang movements all" ON public.stock_movements;
DROP POLICY IF EXISTS "Karyawan read movements" ON public.stock_movements;

CREATE POLICY "Owner gudang movements all" ON public.stock_movements
  FOR ALL USING (get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (get_user_role() IN ('OWNER', 'GUDANG'));

CREATE POLICY "Karyawan read movements" ON public.stock_movements
  FOR SELECT USING (get_user_role() IN ('OWNER', 'KARYAWAN', 'GUDANG'));

-- ------------------------------------------------------------
-- 7. transaction_items.warehouse_id
-- ------------------------------------------------------------
ALTER TABLE public.transaction_items
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 8. Atomic stock change (SECURITY DEFINER)
-- search_path = public saja — tidak menyentuh get_user_role path
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_stock_change(
  p_type TEXT,
  p_product_id UUID,
  p_qty INTEGER,
  p_from_warehouse_id UUID DEFAULT NULL,
  p_to_warehouse_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_from_qty INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Qty harus lebih dari 0';
  END IF;
  IF p_type NOT IN ('IN', 'OUT', 'TRANSFER', 'SALE', 'VOID_RESTORE') THEN
    RAISE EXCEPTION 'Tipe mutasi tidak valid';
  END IF;

  IF p_type IN ('OUT', 'TRANSFER', 'SALE') THEN
    IF p_from_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Gudang asal wajib';
    END IF;
    INSERT INTO public.warehouse_stocks (warehouse_id, product_id, qty)
    VALUES (p_from_warehouse_id, p_product_id, 0)
    ON CONFLICT (warehouse_id, product_id) DO NOTHING;

    SELECT qty INTO v_from_qty
    FROM public.warehouse_stocks
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_from_qty IS NULL OR v_from_qty < p_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup';
    END IF;

    UPDATE public.warehouse_stocks
    SET qty = qty - p_qty
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
  END IF;

  IF p_type IN ('IN', 'TRANSFER', 'VOID_RESTORE') THEN
    IF p_to_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Gudang tujuan wajib';
    END IF;
    INSERT INTO public.warehouse_stocks (warehouse_id, product_id, qty)
    VALUES (p_to_warehouse_id, p_product_id, p_qty)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET qty = public.warehouse_stocks.qty + EXCLUDED.qty;
  END IF;

  IF p_type = 'IN' AND p_to_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Gudang tujuan wajib untuk IN';
  END IF;

  INSERT INTO public.stock_movements (
    type, product_id, from_warehouse_id, to_warehouse_id, qty, note,
    reference_type, reference_id, created_by
  ) VALUES (
    p_type, p_product_id, p_from_warehouse_id, p_to_warehouse_id, p_qty, p_note,
    p_reference_type, p_reference_id, p_created_by
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stock_change FROM PUBLIC;
-- Hanya service_role — jangan GRANT ke authenticated/anon (linter + keamanan).
-- App memanggil RPC lewat SUPABASE_SERVICE_ROLE_KEY (lihat lib/inventory.ts).
GRANT EXECUTE ON FUNCTION public.apply_stock_change TO service_role;

-- ------------------------------------------------------------
-- 9. Storage bucket product-photos
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  true,
  NULL,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owner gudang product photos all" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read product photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read product photos" ON storage.objects;

CREATE POLICY "Owner gudang product photos all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'product-photos' AND get_user_role() IN ('OWNER', 'GUDANG'))
  WITH CHECK (bucket_id = 'product-photos' AND get_user_role() IN ('OWNER', 'GUDANG'));

-- Tidak buat policy SELECT publik — bucket public=true cukup untuk URL langsung.
-- Policy SELECT publik memungkinkan LISTING (linter: public_bucket_allows_listing).

-- ------------------------------------------------------------
-- 10. Seed 2 gudang (skip jika sudah ada)
-- ------------------------------------------------------------
INSERT INTO public.warehouses (name, address, is_active, is_sales_warehouse)
SELECT 'Toko / Showroom', NULL, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses LIMIT 1);

INSERT INTO public.warehouses (name, address, is_active, is_sales_warehouse)
SELECT 'Gudang Utama', NULL, true, false
WHERE (SELECT COUNT(*) FROM public.warehouses) = 1;

COMMENT ON TABLE public.warehouses IS 'Master gudang inventori';
COMMENT ON TABLE public.warehouse_stocks IS 'Qty stok per gudang per produk';
COMMENT ON TABLE public.stock_movements IS 'Riwayat mutasi stok termasuk SALE/VOID';
