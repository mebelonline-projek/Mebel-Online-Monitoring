-- ============================================================
-- 🧹 CLEANUP SEED — Hapus semua data seed
-- ============================================================
-- Jalankan jika ingin reset ke database bersih
-- ⚠️  HANYA hapus data yang dibuat oleh seed (via owner_id)
-- ⚠️  Customers & Products TIDAK dihapus (bisa jadi data asli)
--
-- CARA PAKAI:
--   1. Ganti 'OWNER_UUID_HERE' dengan UUID OWNER Anda
--   2. Jalankan di Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_owner_id UUID := 'OWNER_UUID_HERE';  -- ⚠️ GANTI INI
  v_tx_count INT;
  v_hpp_count INT;
  v_pay_count INT;
  v_op_count INT;
BEGIN
  IF v_owner_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION '⚠️  Ganti OWNER_UUID_HERE dengan UUID user OWNER Anda!';
  END IF;
  IF v_owner_id = 'OWNER_UUID_HERE'::UUID THEN
    RAISE EXCEPTION '⚠️  Ganti OWNER_UUID_HERE dengan UUID user OWNER Anda!';
  END IF;

  -- 1. Hapus HPP items (child paling bawah)
  DELETE FROM hpp_items 
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE created_by = v_owner_id
  );
  GET DIAGNOSTICS v_hpp_count = ROW_COUNT;
  RAISE NOTICE '🗑️  % HPP items dihapus', v_hpp_count;

  -- 2. Hapus payments
  DELETE FROM transaction_payments 
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE created_by = v_owner_id
  );
  GET DIAGNOSTICS v_pay_count = ROW_COUNT;
  RAISE NOTICE '🗑️  % payment records dihapus', v_pay_count;

  -- 3. Hapus transactions
  DELETE FROM transactions WHERE created_by = v_owner_id;
  GET DIAGNOSTICS v_tx_count = ROW_COUNT;
  RAISE NOTICE '🗑️  % transaksi dihapus', v_tx_count;

  -- 4. Hapus operational costs
  DELETE FROM operational_costs WHERE created_by = v_owner_id;
  GET DIAGNOSTICS v_op_count = ROW_COUNT;
  RAISE NOTICE '🗑️  % operational costs dihapus', v_op_count;

  -- 5. Customers & Products TETAP (tidak dihapus)
  RAISE NOTICE '✅ Cleanup selesai. Database kembali bersih.';
  RAISE NOTICE '⚠️  Customers & Products tidak dihapus (bisa jadi data asli).';
END $$;