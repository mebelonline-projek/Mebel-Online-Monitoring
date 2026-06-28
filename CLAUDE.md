@AGENTS.md

# ============================================================
# 📋 KONTEKS PROYEK — Wajib Dibaca AI Agent Baru
# ============================================================
# File ini berisi ringkasan status terkini, catatan penting,
# dan warning yang ditoleransi agar AI baru tidak mengulang
# kesalahan yang sama atau merusak yang sudah berfungsi.
# ============================================================

## 📊 STATUS PROYEK (Juni 2026 — ~95% selesai)

### ✅ Sudah Selesai
- **Fase 1-11** selesai (lihat ROADMAP.md untuk detail)
- Auth (login/register + auto-login + bypass email confirm)
- Customers CRUD (list + modal tambah/edit/hapus)
- Products CRUD (list + modal tambah/edit/hapus)
- Transactions (CRUD + HPP + Payment + Void + Invoice PDF)
- Dashboard Owner (KPI realtime + chart + filter harian/mingguan/bulanan/tahunan + sparkline)
- Dashboard Karyawan (KPI + recent transactions + pending)
- Settings (upload logo toko + info toko + kelola user/karyawan)
- Invoice PDF (preview + download + template)
- Biaya Operasional CRUD (filter per bulan)
- Logo kompresi WebP otomatis via sharp
- PWA (manifest + icons + meta tags)
- **🐛 Fix 404 Cetak Nota & Pelunasan** — `.single()`→`.maybeSingle()`, custom not-found + error boundary
- **🧹 Build cache cleanup** — hapus `next_corrupted`, update `.gitignore`

### ⏳ Belum Selesai
- Fase 11b: Deployment Vercel (build verification, env setup, production deploy)
- Testing & QA final

---

## 🛡️ SUPABASE DATABASE LINTER — Warning Toleransi

### Latar Belakang
Kami menjalankan Supabase Database Linter dan mendapatkan 13 warning.
**8 berhasil dihilangkan**, **5 tersisa** yang harus ditoleransi.

### 5 Warning yang Ditoleransi (JANGAN DIUTAK-ATIK)

| # | Warning | Fungsi/Objek | Alasan Tidak Bisa Dihilangkan |
|---|---------|-------------|------------------------------|
| 1 | anon → rls_auto_enable | `rls_auto_enable()` | **False positive.** Fungsi BAWAAN Supabase (terhubung ke event trigger `ensure_rls`). TIDAK BISA DI-DROP (error dependensi trigger). `REVOKE EXECUTE` sudah diterapkan. |
| 2 | authenticated → rls_auto_enable | `rls_auto_enable()` | **False positive.** Sama seperti #1. Fungsi bawaan Supabase. |
| 3 | authenticated → `create_user_profile` | `create_user_profile()` | **By design.** Fungsi ini WAJIB dipanggil oleh authenticated user saat registrasi. Kalau direvoke, user baru TIDAK BISA DAFTAR. |
| 4 | authenticated → `get_user_role` | `get_user_role()` | **By design.** 13 RLS policy bergantung pada fungsi ini. Kalau direvoke, SEMUA DATA TIDAK BISA DIAKSES (aplikasi blank total). |
| 5 | Leaked Password Protection | Auth Settings | **Pro plan only.** Fitur ini hanya tersedia di Supabase Pro plan ke atas. Tidak bisa diaktifkan di Free plan. |

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
| Login | `/login` | ✅ Ada |
| Register | `/register` | ✅ Ada |

### Catatan: Route yang TIDAK ADA
| Path | Tidak Ada Karena | Alternatif |
|------|-----------------|------------|
| `/customer/tambah` | Tidak dibuat | Gunakan modal di `/customer` |
| `/customer/[id]/edit` | Tidak dibuat | Gunakan modal edit di `/customer` |
| `/produk/tambah` | Tidak dibuat | Gunakan modal di `/produk` |
| `/produk/[id]/edit` | Tidak dibuat | Gunakan modal edit di `/produk` |