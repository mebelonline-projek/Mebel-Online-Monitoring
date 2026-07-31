@AGENTS.md

# ============================================================
# 📋 KONTEKS PROYEK — Wajib Dibaca AI Agent Baru
# ============================================================
# File ini berisi ringkasan status terkini, catatan penting,
# dan warning yang ditoleransi agar AI baru tidak mengulang
# kesalahan yang sama atau merusak yang sudah berfungsi.
# ============================================================

## 📊 STATUS PROYEK (Juli 2026 — inventori + varian aktif)

### ✅ Sudah Selesai
- **Fase 1-11** selesai (lihat ROADMAP.md untuk detail)
- Auth (login/register + auto-login + bypass email confirm)
- Customers CRUD (list + modal tambah/edit/hapus)
- Products CRUD (list + modal tambah/edit/hapus) + **varian warna/ukuran** (parent/leaf)
- Transactions (CRUD + HPP + Payment + Void + Invoice PDF)
- Dashboard Owner (KPI realtime + chart + filter harian/mingguan/bulanan/tahunan + sparkline)
- Dashboard Karyawan (KPI + recent transactions + pending)
- Settings (upload logo toko + info toko + kelola user/karyawan)
- Invoice PDF (preview + download + template)
- Biaya Operasional CRUD (filter per bulan)
- Logo kompresi WebP otomatis via sharp
- PWA (manifest + icons + meta tags)
- **Inventori multi-gudang** — Lokasi, Kategori, Barang, Stok (search/filter), Mutasi (Masuk/Keluar/Pindah)
- **🐛 Fix 404 Cetak Nota & Pelunasan** — `.single()`→`.maybeSingle()`, custom not-found + error boundary
- **🧹 Build cache cleanup** — hapus `next_corrupted`, update `.gitignore`

### ⏳ Belum Selesai
- Fase 11b: Deployment Vercel (build verification, env setup, production deploy) — sering sudah live; cek ulang jika env berubah
- Testing & QA final
- SPA parity: void + port gudang/varian (lihat `MIGRATION-HANDOFF.md`)

### 🔁 Migrasi SPA paralel (aktif)
- Repo SPA: `../aplikasi-monitoring-spa` → GitHub `mebelonline-projek/Mebel-online-kasir-vite`
- Beta: https://mebel-online-kasir-vite.mebelonline.workers.dev/
- DB **shared** (Opsi C) dengan project Supabase monitoring ini
- Rollback produksi: tag git `v1-next-stable`
- **Syarat cutover:** UI SPA harus sama persis dengan app Next ini
- Detail tahap: baca `aplikasi-monitoring-spa/MIGRATION-HANDOFF.md`
- Jangan rewrite Next in-place untuk migrasi; Next tetap app harian sampai cutover
- Catatan 31 Jul: search stok + varian + UX Gudang sudah di Next — port ke SPA saat modul gudang/kasir

### Inventori — aturan singkat (31 Jul 2026)
- Varian: `parent_id` / `warna` / `ukuran` — SQL `supabase/migrate_product_variants.sql` **sudah applied**
- Kasir & stok hanya **leaf** (standalone atau child); parent shell tidak dijual
- Edit barang/varian: satu **Simpan**; qty stok opsional → Mutasi IN/OUT
- Hapus **barang** boleh meski ada stok; **kategori/gudang** tetap diblokir jika dipakai
- Ranking cari (barang, stok, kasir): nama produk → warna/ukuran → kategori
- Detail log: `CHANGELOG.md` bagian `[8.1.0]`

---

## 🛡️ SUPABASE DATABASE LINTER — Warning Toleransi

### Latar Belakang
Baseline lama: 13 warning → 8 diperbaiki → **5 ditoleransi**.
Setelah modul inventori, sempat muncul warning baru (`product-photos` listing, `apply_stock_change` EXECUTE).
Perbaikan: jalankan [`supabase/fix_inventory_linter.sql`](supabase/fix_inventory_linter.sql) + RPC stok hanya via `service_role` di app.

### Warning yang Ditoleransi (JANGAN DIUTAK-ATIK)

Target akhir setelah harden (status aktual ~3 warning):

| # | Warning | Fungsi/Objek | Alasan |
|---|---------|-------------|---------|
| 1 | authenticated → create_user_profile | `create_user_profile()` | **By design.** Wajib untuk registrasi. |
| 2 | authenticated → get_user_role | `get_user_role()` | **By design.** Jantung RLS. |
| 3 | Leaked Password Protection | Auth | **Pro plan only.** |

`rls_auto_enable` / anon EXECUTE biasanya hilang setelah `fix_anon_security_definer.sql`.  
Inventori (`apply_stock_change`, listing `product-photos`) **tidak** boleh kembali ke daftar warning.

**Jangan** revoke `get_user_role` atau `create_user_profile` dari `authenticated`.

### ⚠️ PENTING: JANGAN UBAH search_path FUNGSI INI
Ketiga fungsi di bawah menggunakan `search_path` multi-schema. JANGAN pernah diubah ke `search_path = ''` karena akan MERUSAK aplikasi:

```sql
-- 1. get_user_role — JANTUNG RLS
-- search_path = 'public, auth' (butuh akses ke schema auth untuk auth.uid())
-- Kalau diubah ke '', auth.uid() tidak bisa ditemukan → semua RLS mati

-- 2. generate_invoice_number — auto-generate nomor invoice
-- search_path = 'public' (butuh akses ke tabel public.transactions, fungsi pg_catalog)

-- 3. set_invoice_number — trigger auto invoice
-- search_path = 'public' (harus bisa panggil public.generate_invoice_number())
```

### Pelajaran dari Bug Sebelumnya
- `SET search_path = ''` pada `get_user_role()` menyebabkan `auth.uid()` tidak bisa diakses → semua 13 RLS policy error → aplikasi blank
- `SET search_path = ''` pada `set_invoice_number()` menyebabkan trigger tidak bisa memanggil `generate_invoice_number()` → INSERT transaksi gagal → 404
- Tombol "Tambah pelanggan baru" di form transaksi pernah salah arah ke `/customer/tambah` (tidak ada) → diperbaiki jadi `/customer` (halaman daftar dengan modal tambah)

---

## 🔧 FILE PENTING

### Supabase SQL Files
| File | Isi |
|------|-----|
| `supabase/migration.sql` | Database schema awal (8 tabel + RLS + fungsi) |
| `supabase/fix_all_warnings.sql` | Perbaikan semua 13 warning Linter (VERSI TERBARU) |
| `supabase/fix_inventory_linter.sql` | Fix linter inventori (bucket listing + revoke apply_stock_change) |
| `supabase/fix_anon_security_definer.sql` | Cabut EXECUTE anon dari create_user_profile / get_user_role (REVOKE PUBLIC) |
| `supabase/migrate_inventory.sql` | Schema inventori multi-gudang + role GUDANG |
| `supabase/migrate_product_variants.sql` | Kolom `parent_id`, `warna`, `ukuran` (sudah applied shared DB) |
| `supabase/fix_get_user_role.sql` | Emergency fix untuk search_path (3 fungsi) |
| `supabase/storage_bucket.sql` | Bucket logos + RLS |
| `supabase/seed_dummy.sql` | Data dummy untuk testing |
| `supabase/disable_email_confirmation.sql` | Bypass email confirmation |

### Route yang Ada (Jangan buat route baru tanpa cek ini)
| Halaman | Path | Status |
|---------|------|--------|
| Daftar Customer | `/customer` | ✅ Ada |
| Detail Customer | `/customer/[id]` | ✅ Ada |
| Tambah Customer | `/customer` (modal, bukan halaman) | ✅ Ada sebagai modal di CustomerListClient |
| Daftar Produk | `/produk` | ✅ Ada |
| Detail Produk | `/produk/[id]` | ✅ Ada |
| Daftar Transaksi | `/transaksi` | ✅ Ada |
| Tambah Transaksi | `/transaksi/tambah` | ✅ Ada |
| Detail Transaksi | `/transaksi/[id]` | ✅ Ada |
| Edit Transaksi | `/transaksi/[id]/edit` | ✅ Ada |
| Pelunasan | `/transaksi/[id]/pelunasan` | ✅ Ada |
| Invoice | `/transaksi/[id]/invoice` | ✅ Ada |
| HPP | `/transaksi/[id]/hpp` | ✅ Ada |
| Dashboard Owner | `/dashboard/owner` | ✅ Ada |
| Dashboard Karyawan | `/dashboard/karyawan` | ✅ Ada |
| Pengaturan | `/pengaturan` | ✅ Ada |
| Inventori — Lokasi gudang | `/gudang` | ✅ Ada |
| Inventori — Kategori | `/gudang/kategori` | ✅ Ada |
| Inventori — Barang (+ varian) | `/gudang/barang` | ✅ Ada |
| Inventori — Stok (search/filter) | `/gudang/stok` | ✅ Ada |
| Inventori — Mutasi | `/gudang/mutasi` | ✅ Ada |
| Login | `/login` | ✅ Ada |
| Register | `/register` | ✅ Ada |

### Catatan: Route yang TIDAK ADA
| Path | Tidak Ada Karena | Alternatif |
|------|-----------------|------------|
| `/customer/tambah` | Tidak dibuat | Gunakan modal di `/customer` |
| `/customer/[id]/edit` | Tidak dibuat | Gunakan modal edit di `/customer` |
| `/produk/tambah` | Tidak dibuat | Gunakan modal di `/produk` |
| `/produk/[id]/edit` | Tidak dibuat | Gunakan modal edit di `/produk` |