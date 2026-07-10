-- ============================================================
-- MIGRASI: transaction_items + fulfillment_status
-- ============================================================
-- Jalankan di Supabase SQL Editor (sekali).

-- 1. Status fulfillment di transaksi
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'MENUNGGU';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_fulfillment_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_fulfillment_status_check
  CHECK (fulfillment_status IN ('MENUNGGU', 'PRODUKSI', 'SIAP_KIRIM', 'SELESAI'));

-- 2. Tabel line items (multi-produk per transaksi)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price BIGINT NOT NULL DEFAULT 0,
  line_total BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx
  ON public.transaction_items (transaction_id);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner full access on transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Karyawan select transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Karyawan insert transaction_items" ON public.transaction_items;

CREATE POLICY "Owner full access on transaction_items" ON public.transaction_items
  FOR ALL USING (get_user_role() = 'OWNER');

CREATE POLICY "Karyawan select transaction_items" ON public.transaction_items
  FOR SELECT USING (get_user_role() = 'KARYAWAN');

CREATE POLICY "Karyawan insert transaction_items" ON public.transaction_items
  FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');

COMMENT ON TABLE public.transaction_items IS 'Line items multi-produk per transaksi';
COMMENT ON COLUMN public.transactions.fulfillment_status IS 'MENUNGGU | PRODUKSI | SIAP_KIRIM | SELESAI';
