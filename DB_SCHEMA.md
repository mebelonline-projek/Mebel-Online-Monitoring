# 🗄️ DATABASE SCHEMA — Mebel Online Monitoring

> **File ini adalah referensi untuk AI agent.**  
> Baca ini SEBELUM menulis kode yang berinteraksi dengan Supabase.
> Update file ini jika ada perubahan schema.

---

## 📊 Overview

| Item | Detail |
|------|--------|
| **Platform** | Supabase PostgreSQL |
| **Total Tabel** | 7 aktif (setelah migrasi V2) |
| **Auth** | Supabase Auth (`auth.users`) + Row Level Security |
| **Role** | `OWNER` (full akses), `KARYAWAN` (terbatas) |
| **Storage** | 1 bucket: `logos` (public, WebP only) |
| **RLS Function** | `get_user_role()` — membaca role dari `public.users` |

---

## 🧩 Tabel-Tabel

### 1. `users` — Akun karyawan & owner

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK → `auth.users(id)` | Sama dengan ID auth.users |
| `email` | `TEXT` | NOT NULL | |
| `name` | `TEXT` | NOT NULL | |
| `role` | `TEXT` | NOT NULL CHECK IN (`'OWNER'`, `'KARYAWAN'`) | |
| `avatar_url` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |

**⚠️ Warning:** Jangan query `users` pakai anon key — pakai `adminClient` (service_role)  
**⚠️ Warning:** `auth.users` adalah tabel sistem — JANGAN di-query langsung dari client

---

### 2. `transactions` — Catatan Penjualan (CORE)

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `transaction_number` | `TEXT` | **UNIQUE** NOT NULL | Auto-generate: `TRX-YYYYMMDD-NNN` |
| `customer_name` | `TEXT` | NULLABLE | Langsung nama (bukan FK) |
| `description` | `TEXT` | NULLABLE | Deskripsi transaksi |
| `final_price` | `BIGINT` | NOT NULL | Harga final (dalam rupiah) |
| `payment_type` | `TEXT` | NOT NULL CHECK(`'CASH'`,`'DP'`) | |
| `dp_amount` | `BIGINT` | DEFAULT 0 | |
| `status` | `TEXT` | NOT NULL DEFAULT `'DP'` | CHECK(`'LUNAS'`,`'DP'`,`'MENUNGGU_PELUNASAN'`,`'BATAL'`) |
| `void_reason` | `TEXT` | NULLABLE | |
| `created_by` | `UUID` | → `auth.users(id)` | |
| `void_by` | `UUID` | → `auth.users(id)` | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |
| `void_at` | `TIMESTAMPTZ` | NULLABLE | |

**⚠️ Perubahan:** `customer_name` dulu bernama `customer_id` (FK→customers).  
Sekarang TEXT biasa — bukan foreign key.

---

### 3. `transaction_payments` — Riwayat Pembayaran (Pelunasan DP)

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `transaction_id` | `UUID` | FK → `transactions(id)` ON DELETE CASCADE | |
| `amount` | `BIGINT` | NOT NULL | |
| `payment_date` | `TIMESTAMPTZ` | DEFAULT `now()` | |
| `method` | `TEXT` | NOT NULL CHECK(`'TUNAI'`, `'TRANSFER'`) | |
| `note` | `TEXT` | NULLABLE | |
| `created_by` | `UUID` | → `auth.users(id)` | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |

---

### 4. `hpp_items` — Harga Pokok Penjualan per Transaksi

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `transaction_id` | `UUID` | FK → `transactions(id)` ON DELETE CASCADE | |
| `name` | `TEXT` | NOT NULL | Nama item biaya |
| `amount` | `BIGINT` | NOT NULL | Jumlah biaya |
| `note` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |

---

### 5. `operational_costs` — Biaya Operasional

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `name` | `TEXT` | NOT NULL | Nama biaya |
| `amount` | `BIGINT` | NOT NULL | Jumlah biaya |
| `category` | `TEXT` | DEFAULT `'LAINNYA'` | **Harus diisi!** |
| `period_start` | `DATE` | NOT NULL | |
| `period_end` | `DATE` | NOT NULL | |
| `created_by` | `UUID` | → `auth.users(id)` | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |

**🐛 Bug History:** Kolom `category` dulunya `NOT NULL` tanpa default → error saat insert.  
**Solusi:** Default `'LAINNYA'` + isi eksplisit di setiap insert.

---

### 6. `invoices` — Faktur/Invoice (OPSIONAL)

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `invoice_number` | `TEXT` | UNIQUE NOT NULL | Auto: `INV-YYYYMMDD-NNN` |
| `customer_name` | `TEXT` | NULLABLE | |
| `status` | `TEXT` | NOT NULL DEFAULT `'DRAFT'` | CHECK: `'DRAFT'`, `'SENT'`, `'PAID'`, `'CANCELLED'` |
| `total_amount` | `BIGINT` | NOT NULL | Total dari semua transaksi |
| `total_paid` | `BIGINT` | NOT NULL DEFAULT 0 | Total sudah dibayar |
| `remaining_amount` | `BIGINT` | NOT NULL DEFAULT 0 | Sisa tagihan |
| `notes` | `TEXT` | NULLABLE | |
| `created_by` | `UUID` | → `auth.users(id)` | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `now()` | |

---

### 7. `invoice_items` — Item dalam Invoice

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `invoice_id` | `UUID` | FK → `invoices(id)` ON DELETE CASCADE | |
| `transaction_id` | `UUID` | FK → `transactions(id)` | |
| `description` | `TEXT` | NULLABLE | |
| `amount` | `BIGINT` | NOT NULL | |

---

### 8. `store_settings` — Pengaturan Toko

| Kolom | Tipe | Constraint | Catatan |
|-------|------|-----------|---------|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | |
| `store_name` | `TEXT` | NOT NULL | |
| `address` | `TEXT` | NULLABLE | |
| `phone` | `TEXT` | NULLABLE | |
| `logo_url` | `TEXT` | NULLABLE | Public URL logo WebP |
| `updated_by` | `UUID` | → `auth.users(id)` | |
| `updated_at` | `TIMESTAMPTZ` | NULLABLE | |

---

## 🔐 RLS Policies — Ringkasan

| Tabel | OWNER | KARYAWAN |
|-------|-------|----------|
| `users` | Full (via admin client) | Tidak bisa akses langsung |
| `transactions` | ALL | ALL |
| `transaction_payments` | ALL | ALL |
| `hpp_items` | ALL | ALL |
| `operational_costs` | ALL | ALL |
| `invoices` | ALL | SELECT, INSERT, UPDATE |
| `invoice_items` | ALL | ALL |
| `store_settings` | ALL | SELECT |

**⚠️ Penting:** `users` TIDAK bisa di-query dengan anon key → semua query users **WAJIB** pakai `createAdminClient()` (service_role key).

---

## 🔄 Trigger & Function

| Nama | Tabel | Fungsi |
|------|-------|--------|
| `trg_set_transaction_number` | `transactions` | Auto-generate `TRX-YYYYMMDD-NNN` |
| `trg_set_invoice_number` | `invoices` | Auto-generate `INV-YYYYMMDD-NNN` |
| `get_user_role()` | — | Mengembalikan role user (dipakai RLS) |

**⚠️ Warning:** JANGAN ubah `search_path` fungsi-fungsi ini:
- `get_user_role()` pakai `search_path = 'public, auth'` — butuh akses `auth.uid()`
- Trigger function pakai `search_path = 'public'`

---

## 📦 Storage Bucket: `logos`

| Atribut | Nilai |
|---------|-------|
| **Public** | ✅ Ya |
| **Format** | WebP (kompresi 90% via sharp) |
| **File name** | `logo.webp` (selalu overwrite) |
| **RLS** | Owner: ALL, Karyawan: SELECT |
