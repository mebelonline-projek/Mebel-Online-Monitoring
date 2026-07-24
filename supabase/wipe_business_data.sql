-- ============================================================
-- WIPE BUSINESS DATA — Kosongkan data seed/demo untuk produksi
-- ============================================================
-- Hapus: invoice, transaksi (+HPP/bayar/items), biaya, stok/mutasi,
--        produk, kategori, pelanggan, gudang.
-- TETAP: auth.users, public.users, store_settings, bucket logos
--
-- Foto produk: JANGAN DELETE storage.objects lewat SQL (diblok Supabase).
--   Hapus manual di Dashboard → Storage → product-photos (atau Storage API).
--
-- Boleh dipakai untuk prep produksi ATAU reset QA lokal.
-- ⚠️ Backup / catat count dulu jika ragu. Tidak bisa di-undo.
-- Jalankan di Supabase SQL Editor (proyek yang dituju).
-- JANGAN jalankan seed_*.sql lagi di produksi setelah ini.
-- ============================================================

DO $$
DECLARE
  n INT;
  v_tx INT;
  v_products INT;
  v_customers INT;
  v_invoices INT;
  v_op INT;
  v_users INT;
  v_photos INT;
BEGIN
  -- Invoice
  DELETE FROM public.invoice_items;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'invoice_items: %', n;

  DELETE FROM public.invoices;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'invoices: %', n;

  -- Transaksi children
  DELETE FROM public.hpp_items;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'hpp_items: %', n;

  DELETE FROM public.transaction_payments;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'transaction_payments: %', n;

  IF to_regclass('public.transaction_items') IS NOT NULL THEN
    DELETE FROM public.transaction_items;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'transaction_items: %', n;
  END IF;

  -- Inventori movements (sebelum products/warehouses)
  IF to_regclass('public.stock_movements') IS NOT NULL THEN
    DELETE FROM public.stock_movements;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'stock_movements: %', n;
  END IF;

  DELETE FROM public.transactions;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'transactions: %', n;

  DELETE FROM public.operational_costs;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'operational_costs: %', n;

  IF to_regclass('public.warehouse_stocks') IS NOT NULL THEN
    DELETE FROM public.warehouse_stocks;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'warehouse_stocks: %', n;
  END IF;

  DELETE FROM public.products;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'products: %', n;

  IF to_regclass('public.product_categories') IS NOT NULL THEN
    DELETE FROM public.product_categories;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'product_categories: %', n;
  END IF;

  DELETE FROM public.customers;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'customers: %', n;

  IF to_regclass('public.warehouses') IS NOT NULL THEN
    DELETE FROM public.warehouses;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'warehouses: %', n;
  END IF;

  -- Verifikasi
  SELECT COUNT(*) INTO v_tx FROM public.transactions;
  SELECT COUNT(*) INTO v_products FROM public.products;
  SELECT COUNT(*) INTO v_customers FROM public.customers;
  SELECT COUNT(*) INTO v_invoices FROM public.invoices;
  SELECT COUNT(*) INTO v_op FROM public.operational_costs;
  SELECT COUNT(*) INTO v_users FROM public.users;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_photos
    FROM storage.objects
    WHERE bucket_id = 'product-photos';
  ELSE
    v_photos := 0;
  END IF;

  RAISE NOTICE '✅ WIPE SELESAI. users & store_settings & logos tetap.';
  RAISE NOTICE 'Verifikasi — tx:%, products:%, customers:%, invoices:%, op_costs:%, users:%',
    v_tx, v_products, v_customers, v_invoices, v_op, v_users;
  RAISE NOTICE 'Harapan: semua count bisnis = 0, users > 0';
  IF v_photos > 0 THEN
    RAISE NOTICE '⚠️ Masih ada % file di storage product-photos — hapus manual di Dashboard → Storage.', v_photos;
  END IF;
END $$;

-- Query verifikasi manual (jalankan terpisah jika perlu):
-- SELECT
--   (SELECT COUNT(*) FROM transactions) AS tx,
--   (SELECT COUNT(*) FROM products) AS products,
--   (SELECT COUNT(*) FROM customers) AS customers,
--   (SELECT COUNT(*) FROM invoices) AS invoices,
--   (SELECT COUNT(*) FROM operational_costs) AS op_costs,
--   (SELECT COUNT(*) FROM users) AS users;
