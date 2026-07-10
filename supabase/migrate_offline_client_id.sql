-- Offline sync: client_id untuk idempotency transaksi dari HP
-- Jalankan di Supabase SQL Editor (sekali)

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS client_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_transactions_client_id
  ON public.transactions (client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.client_id IS
  'UUID dari perangkat client saat sync offline — cegah duplikat';
