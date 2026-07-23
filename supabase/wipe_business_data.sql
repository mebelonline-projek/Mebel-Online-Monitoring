-- ============================================================
-- WIPE BUSINESS DATA — Kosongkan data simulasi bisnis
-- ============================================================
-- Hapus: invoice, transaksi (+HPP/bayar/items), biaya, stok/mutasi,
--        produk, kategori, pelanggan, gudang.
-- TETAP: auth.users, public.users, store_settings
--
-- ⚠️ Hanya untuk DB lokal/dev. Backup dulu jika ragu.
-- Jalankan di Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  n INT;
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

  -- Inventori movements (sebelum transactions jika ada FK reference — tidak wajib)
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

  RAISE NOTICE '✅ WIPE SELESAI. users & store_settings tetap.';
  RAISE NOTICE 'Cek: SELECT COUNT(*) FROM transactions; — harus 0';
END $$;
