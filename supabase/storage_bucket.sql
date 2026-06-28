-- ============================================================
-- 🗄️ STORAGE BUCKET — Logos
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor setelah migration utama.
-- Membuat bucket storage untuk logo toko + RLS policy.
-- Semua logo otomatis dikompresi ke WebP (quality 90%) di server.
-- ============================================================

-- ============================================================
-- 1. BUAT BUCKET logos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true, -- public: bisa diakses via URL tanpa auth
  NULL, -- tanpa batasan ukuran (kompresi WebP sudah handle)
  ARRAY['image/webp']::text[] -- hanya terima file WebP
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. RLS POLICY — Bucket logos
-- ============================================================
-- Menggunakan fungsi get_user_role() yang sudah dibuat di migration.sql
-- Fungsi SECURITY DEFINER — aman diakses dari storage RLS

-- Owner: full access (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Owner full access on logos" ON storage.objects
  FOR ALL
  USING (bucket_id = 'logos' AND get_user_role() = 'OWNER')
  WITH CHECK (bucket_id = 'logos' AND get_user_role() = 'OWNER');

-- Karyawan: hanya bisa SELECT (melihat logo)
CREATE POLICY "Karyawan read logos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos' AND get_user_role() = 'KARYAWAN');

-- Public: bisa SELECT (untuk tampilkan logo di invoice PDF)
CREATE POLICY "Public read logos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');