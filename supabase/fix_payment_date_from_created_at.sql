-- ============================================================
-- FIX: payment_date seed — samakan dengan created_at historis
-- ============================================================
-- Penyebab: seed lama tidak isi payment_date → DEFAULT now()
-- → semua omzet jatuh ke "hari ini" → KPI semua periode sama,
--   grafik cuma 1 bar.
-- Jalankan sekali di SQL Editor (aman diulang).
-- ============================================================

UPDATE public.transaction_payments
SET payment_date = created_at;

-- Verifikasi: payment harus tersebar per tahun
SELECT
  EXTRACT(YEAR FROM payment_date)::INT AS tahun,
  COUNT(*) AS payment_count,
  SUM(amount) AS total
FROM public.transaction_payments
GROUP BY 1
ORDER BY 1;
