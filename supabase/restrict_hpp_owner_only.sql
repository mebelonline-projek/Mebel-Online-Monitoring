-- ============================================================
-- HPP Owner Only — Cabut akses Karyawan ke hpp_items
-- ============================================================
-- Jalankan di Supabase SQL Editor setelah deploy kode app.
-- Hanya OWNER yang boleh SELECT/INSERT/UPDATE/DELETE hpp_items.
-- Policy "Owner full access on hpp_items" tetap dipakai.
-- ============================================================

DROP POLICY IF EXISTS "Karyawan full access on hpp_items" ON hpp_items;
