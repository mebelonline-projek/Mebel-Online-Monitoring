-- ============================================================
-- Product variants: parent_id + warna + ukuran
-- Jalankan sekali di Supabase SQL Editor (project monitoring, Opsi C shared).
-- Aman untuk produk lama: parent_id NULL = standalone (bisa dijual + stok).
-- Parent shell (punya anak): tidak dijual; stok/kasir hanya leaf (child atau standalone).
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS warna TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ukuran TEXT;

CREATE INDEX IF NOT EXISTS idx_products_parent_id
  ON public.products (parent_id);

COMMENT ON COLUMN public.products.parent_id IS
  'NULL = standalone atau parent shell. Non-null = varian (leaf) dari produk utama.';
COMMENT ON COLUMN public.products.warna IS 'Atribut varian (opsional).';
COMMENT ON COLUMN public.products.ukuran IS 'Atribut varian (opsional).';
