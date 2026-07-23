-- ============================================================
-- FIX LINTER — Inventori (product-photos + apply_stock_change)
-- Jalankan di Supabase SQL Editor setelah migrate_inventory.sql
-- ============================================================
-- Memperbaiki:
--  1. Public bucket listing product-photos
--  2. anon/authenticated EXECUTE pada apply_stock_change (SECURITY DEFINER)
--  3. Re-assert REVOKE anon pada fungsi lama (aman diulang)
--
-- TIDAK mengubah search_path get_user_role / create_user_profile.
-- TIDAK revoke get_user_role / create_user_profile dari authenticated.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Hapus policy SELECT publik yang memungkinkan LISTING
--    Bucket tetap public=true → getPublicUrl tetap jalan.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public read product photos" ON storage.objects;

-- ------------------------------------------------------------
-- 2. apply_stock_change — hanya service_role (server app)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.apply_stock_change(
  text, uuid, integer, uuid, uuid, text, text, uuid, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.apply_stock_change(
  text, uuid, integer, uuid, uuid, text, text, uuid, uuid
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_stock_change(
  text, uuid, integer, uuid, uuid, text, text, uuid, uuid
) TO service_role;

-- ------------------------------------------------------------
-- 3. Re-assert REVOKE anon (fungsi lama)
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_user_profile(
  uuid, text, text, text
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- ============================================================
-- Setelah run: hilang warning product-photos listing +
-- anon/auth apply_stock_change.
-- Sisa ditoleransi: rls_auto_enable, create_user_profile (auth),
-- get_user_role (auth), leaked password (Pro).
-- ============================================================
