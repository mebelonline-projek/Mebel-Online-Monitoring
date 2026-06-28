# 📋 PRD — Mebel Online Monitoring

> **Product Requirement Document**  
> Aplikasi Manajemen Keuangan Toko Furnitur  
> Target: Owner + Karyawan  
> Platform: PWA (Next.js + Supabase)

---

## 1. PRODUCT OVERVIEW

### 1.1 Nama Aplikasi
**Mebel Online Monitoring**

### 1.2 Elevator Pitch
Aplikasi PWA untuk pemilik toko furnitur mencatat transaksi penjualan, melacak HPP (Harga Pokok Penjualan) per transaksi, memantau biaya operasional bulanan, mencetak invoice PDF, dan melihat dashboard keuangan dengan grafik omzet & laba secara real-time.

### 1.3 Target User
- **Owner** (pemilik toko, 35-50 tahun) — butuh big picture keuangan
- **Karyawan** (1-2 orang) — input transaksi & operasional sehari-hari

### 1.4 Tech Stack
| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Server Components + Client Components |
| Database | Supabase (PostgreSQL) | Query via `@supabase/supabase-js` |
| Auth | Supabase Auth | Email/password, Row Level Security |
| UI | Shadcn UI + Tailwind CSS v4 | 16 komponen siap pakai |
| Style | Dark mode (next-themes) | Wajib dark mode |
| Chart | Recharts v3 | Bar + Line chart dashboard |
| PDF | @react-pdf/renderer | Generate invoice PDF |
| Toast | Sonner | Notifikasi sukses/gagal |
| Form | react-hook-form + Zod | Validasi schema-based |
| Icons | lucide-react | 1000+ ikon |
| Font | Geist Sans + Geist Mono | Sudah terinstall |
| Deployment | Vercel | CI/CD otomatis |

---

## 2. USER ROLES & PERMISSIONS

| Fitur | Owner | Karyawan |
|-------|-------|----------|
| Melihat semua transaksi | ✅ | ✅ |
| Input transaksi baru | ✅ | ✅ |
| Edit transaksi (belum lunas) | ✅ | ✅ |
| Void/batal transaksi (soft-delete) | ✅ | ❌ |
| Hapus transaksi permanen | ✅ | ❌ |
| Input HPP per transaksi | ✅ | ✅ |
| Input biaya operasional | ✅ | ✅ |
| Lihat dashboard keuangan (chart + KPI) | ✅ | ❌ |
| Lihat ringkasan pengeluaran total | ✅ | ❌ |
| Export/cetak invoice PDF | ✅ | ✅ |
| Cetak ulang invoice | ✅ | ✅ |
| Kelola produk/katalog | ✅ | ✅ (read only) |
| Tambah customer baru | ✅ | ✅ |
| Kelola user (tambah/ubah karyawan) | ✅ | ❌ |
| Setting toko (nama, alamat, logo) | ✅ | ❌ |
| Lihat data customer | ✅ | ✅ |
| Lihat daftar produk | ✅ | ✅ |

---

## 3. DATABASE SCHEMA (Supabase)

### 3.1 Tabel: `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, default `gen_random_uuid()` |
| email | text | UNIQUE, NOT NULL |
| password_hash | text | NOT NULL |
| name | text | NOT NULL |
| role | text | NOT NULL, check: 'OWNER' or 'KARYAWAN' |
| avatar_url | text | nullable |
| created_at | timestamptz | default `now()` |

### 3.2 Tabel: `products` (Katalog)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | NOT NULL |
| description | text | nullable |
| base_price | bigint | NOT NULL, harga acuan dalam rupiah |
| created_by | UUID | FK → users.id |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

### 3.3 Tabel: `customers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | NOT NULL |
| phone | text | nullable |
| address | text | nullable |
| created_by | UUID | FK → users.id |
| created_at | timestamptz | default `now()` |

### 3.4 Tabel: `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| invoice_number | text | UNIQUE, auto-generate: `INV-YYYYMMDD-XXX` |
| customer_id | UUID | FK → customers.id |
| product_id | UUID | FK → products.id, nullable (custom product) |
| custom_product_name | text | nullable, jika produk custom |
| description | text | nullable, deskripsi transaksi |
| final_price | bigint | NOT NULL, harga jual final |
| payment_type | text | NOT NULL, 'CASH' or 'DP' |
| dp_amount | bigint | nullable, 0 jika cash |
| status | text | NOT NULL, default 'DP', check: 'LUNAS', 'DP', 'MENUNGGU_PELUNASAN', 'BATAL' |
| void_reason | text | nullable, alasan pembatalan |
| created_by | UUID | FK → users.id |
| void_by | UUID | FK → users.id, nullable |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |
| void_at | timestamptz | nullable |

### 3.5 Tabel: `transaction_payments` (Riwayat Pembayaran)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions.id |
| amount | bigint | NOT NULL |
| payment_date | timestamptz | default `now()` |
| method | text | NOT NULL, 'TUNAI' or 'TRANSFER' |
| note | text | nullable |
| created_by | UUID | FK → users.id |
| created_at | timestamptz | default `now()` |

### 3.6 Tabel: `hpp_items` (Biaya HPP per Transaksi)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions.id |
| name | text | NOT NULL, e.g. 'Ongkir', 'Biaya Tukang', 'Bahan' |
| amount | bigint | NOT NULL |
| note | text | nullable |
| created_by | UUID | FK → users.id |
| created_at | timestamptz | default `now()` |

### 3.7 Tabel: `operational_costs` (Biaya Operasional)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | NOT NULL |
| amount | bigint | NOT NULL |
| category | text | NOT NULL, 'LISTRIK', 'GAJI', 'BAHAN_BAKU', 'SEWA', 'LAINNYA' |
| period_start | date | NOT NULL |
| period_end | date | NOT NULL |
| note | text | nullable |
| created_by | UUID | FK → users.id |
| created_at | timestamptz | default `now()` |

### 3.8 Tabel: `store_settings` (Pengaturan Toko)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| store_name | text | NOT NULL, 'Mebel Online Monitoring' |
| address | text | nullable |
| phone | text | nullable |
| logo_url | text | nullable |
| updated_by | UUID | FK → users.id |
| updated_at | timestamptz | default `now()` |

### 3.9 Row Level Security (RLS) Policy
- **OWNER**: Full access ke semua tabel
- **KARYAWAN**: 
  - `transactions`: SELECT (semua), INSERT, UPDATE (tidak bisa ubah status ke BATAL)
  - `hpp_items`: SELECT, INSERT, UPDATE, DELETE (milik transaksi yang dia akses)
  - `operational_costs`: SELECT, INSERT
  - `products`: SELECT only
  - `customers`: SELECT, INSERT
  - `store_settings`: SELECT only
  - `transaction_payments`: SELECT, INSERT
  - `users`: SELECT only (dirinya sendiri)

---

## 4. CORE FEATURES (CRUTD+)

### 4.1 Transaksi
- ✅ **Create**: Form tambah transaksi (pilih customer, pilih produk, input harga, pilih cash/dp)
- ✅ **Read**: Detail transaksi (info lengkap + HPP + riwayat pembayaran)
- ✅ **Update**: Edit transaksi sebelum status lunas/batal
- ✅ **List**: Daftar transaksi dengan filter status, search, pagination
- ✅ **Delete**: Void (soft-delete) oleh owner + konfirmasi
- ✅ **+ Validasi**: Harga > 0, DP ≤ harga, payment required
- ✅ **+ Loading**: Skeleton saat load daftar
- ✅ **+ Empty**: "Belum ada transaksi"
- ✅ **+ Error**: Toast error jika gagal simpan
- ✅ **+ Notifikasi**: Toast sukses setelah simpan

### 4.2 HPP (Per Transaksi)
- ✅ **Create**: Tambah item biaya (nama, jumlah)
- ✅ **Read**: Lihat daftar HPP di detail transaksi
- ✅ **Update**: Edit nominal HPP
- ✅ **List**: Tampil di detail transaksi + total
- ✅ **Delete**: Hapus item HPP dengan konfirmasi
- ✅ **+ Auto-kalkulasi**: Total HPP, Laba Kotor = Harga Jual - Total HPP
- ✅ **+ Notifikasi**: Toast untuk setiap aksi

### 4.3 Biaya Operasional
- ✅ **Create**: Input biaya dengan kategori, periode, nominal
- ✅ **Read**: Detail biaya operasional
- ✅ **Update**: Edit biaya (owner only)
- ✅ **List**: Daftar biaya per periode, filter kategori
- ✅ **Delete**: Hapus dengan konfirmasi (owner only)
- ✅ **+ Auto-kalkulasi**: Total biaya operasional per periode

### 4.4 Pembayaran (DP/Cash)
- ✅ **Cash**: 1 pembayaran langsung → status LUNAS
- ✅ **DP**: Input DP → status DP → nanti bisa input pelunasan → status LUNAS
- ✅ **Riwayat**: Lihat semua pembayaran per transaksi
- ✅ **+ Auto-status**: Otomatis update status saat pelunasan

### 4.5 Invoice PDF
- ✅ **Generate**: Nomor invoice auto, format INVOICE-YYYYMMDD-XXX
- ✅ **Preview**: Tampilkan preview sebelum download
- ✅ **Download**: Download PDF
- ✅ **Cetak ulang**: Dari halaman detail transaksi
- ✅ **Template**: Nama toko, alamat, logo, customer, produk, harga, DP, sisa, status

### 4.6 Dashboard Owner
- ✅ **KPI Cards**: 4 card (Omzet, Laba Kotor, Laba Bersih, Margin %)
- ✅ **Trend**: % change + mini sparkline per card
- ✅ **Chart**: ComposedChart (Bar omzet + Line laba kotor + Line laba bersih)
- ✅ **Filter**: Harian / Mingguan / Bulanan / Tahunan
- ✅ **Recent Transactions**: List 4-5 transaksi terbaru
- ✅ **Export Report**: Tombol export (future: CSV)

### 4.7 Dashboard Karyawan
- ✅ **KPI Cards**: Total Transaksi Hari Ini, Pending Payments, Completed Deliveries
- ✅ **Pending Actions**: List transaksi yang butuh aksi (awaiting payment, HPP input needed)
- ✅ **Recent Transactions**: Tabel transaksi terkini

### 4.8 Produk (Katalog)
- ✅ **Create**: Tambah produk (nama, deskripsi, harga dasar)
- ✅ **Read**: Detail produk
- ✅ **Update**: Edit produk (owner only)
- ✅ **List**: Daftar produk dengan search
- ✅ **Delete**: Hapus dengan konfirmasi (owner only)

### 4.9 Customer
- ✅ **Create**: Tambah customer (nama, telepon, alamat)
- ✅ **Read**: Detail customer + riwayat transaksi
- ✅ **Update**: Edit customer
- ✅ **List**: Daftar customer dengan search
- ✅ **Delete**: Hapus dengan konfirmasi (owner only)

### 4.10 Pengaturan Toko
- ✅ **Create**: Setting awal toko
- ✅ **Read**: Lihat setting saat ini
- ✅ **Update**: Edit nama toko, alamat, telepon, logo
- ✅ **Kelola User**: Tambah/ubah/hapus user (owner only)

---

## 5. STRUKTUR HALAMAN (ROUTES)

| Route | Halaman | Role |
|-------|---------|------|
| `/` | Redirect ke `/dashboard` | All |
| `/dashboard` | Dashboard (owner atau karyawan sesuai role) | All |
| `/transaksi` | Daftar transaksi | All |
| `/transaksi/tambah` | Form tambah transaksi | All |
| `/transaksi/[id]` | Detail transaksi | All |
| `/transaksi/[id]/edit` | Edit transaksi | All |
| `/transaksi/[id]/invoice` | Preview & download invoice PDF | All |
| `/transaksi/[id]/pelunasan` | Form pelunasan DP | All |
| `/hpp/[transactionId]` | Kelola HPP per transaksi | All |
| `/produk` | Daftar produk | All |
| `/produk/tambah` | Tambah produk | Owner |
| `/produk/[id]/edit` | Edit produk | Owner |
| `/customer` | Daftar customer | All |
| `/customer/tambah` | Tambah customer | All |
| `/customer/[id]` | Detail customer | All |
| `/customer/[id]/edit` | Edit customer | All |
| `/operasional` | Daftar biaya operasional | All |
| `/operasional/tambah` | Tambah biaya operasional | All |
| `/operasional/[id]/edit` | Edit biaya operasional | Owner |
| `/pengaturan` | Setting toko | Owner |
| `/pengaturan/user` | Kelola user | Owner |
| `/login` | Halaman login | Public |
| `/register` | Halaman register | Public (hanya 1x) |

---

## 6. DASHBOARD SPESIFICATION

### 6.1 Owner Dashboard

#### KPI Cards (4)
1. **Omzet** — Total harga jual transaksi LUNAS + DP (yang sudah dibayar)
   - Icon: `wallet` (lucide)
   - Trend: % change + sparkline mini
2. **Laba Kotor** — Omzet - Total HPP
   - Icon: `bar_chart` 
   - Trend: % change + sparkline mini
3. **Laba Bersih** — Laba Kotor - Total Biaya Operasional
   - Icon: `payments`
   - Trend: % change + sparkline mini
4. **Margin %** — (Laba Bersih / Omzet) × 100
   - Icon: `percent`
   - Trend: % change + sparkline mini

#### Chart
- **Type**: ComposedChart (Recharts)
- **Bar**: Omzet (warna primary)
- **Line 1**: Laba Kotor (warna hijau/cyan)
- **Line 2**: Laba Bersih (warna orange/kuning)
- **Filter**: Daily / Weekly / Monthly / Yearly
- **Legend**: Tampilkan di bawah chart
- **Tooltip**: Informasi detail saat hover

#### Recent Transactions
- Tabel 5 baris terakhir
- Kolom: Customer, Produk, Amount, Status, Action

### 6.2 Karyawan Dashboard

#### KPI Cards (3)
1. **Total Transaksi Hari Ini** — Jumlah transaksi
2. **Pending Payments** — Transaksi status DP/MENUNGGU
3. **Completed** — Transaksi selesai hari ini

#### Pending Actions
- List transaksi yang butuh aksi
- Badge: "Awaiting Payment", "HPP Input Needed"
- Klik → langsung ke detail transaksi

#### Recent Transactions
- Tabel compact dengan semua transaksi
- Kolom: Order ID, Customer, Items, Status, Action

---

## 7. INVOICE PDF TEMPLATE

```
┌──────────────────────────────────────┐
│  MEBEL ONLINE MONITORING             │
│  Alamat Toko                         │
│  Telp: 08xxx                         │
│  ═══════════════════════════════════  │
│  INVOICE #INV-20260624-001           │
│  Tanggal: 24 Juni 2026               │
│  ═══════════════════════════════════  │
│  Kepada Yth:                          │
│  [Nama Customer]                     │
│  [Telepon Customer]                  │
│  ═══════════════════════════════════  │
│  Produk       : [Nama Produk]        │
│  Deskripsi    : [Deskripsi]          │
│  ═══════════════════════════════════  │
│  Harga        : Rp xxx               │
│  DP Dibayar   : Rp xxx               │
│  ───────────────────────────────────  │
│  Sisa Tagihan : Rp xxx               │
│  ═══════════════════════════════════  │
│  Status Pembayaran: [LUNAS/DP/dll]   │
│  ═══════════════════════════════════  │
│  Terima kasih atas kepercayaan Anda! │
└──────────────────────────────────────┘
```

---

## 8. STATUS TRANSACTION FLOW

```
[INPUT TRANSAKSI]
       │
       ├── Cash ──────────→ LUNAS (langsung)
       │
       └── DP ──→ DP (uang muka) ──→ MENUNGGU_PELUNASAN
                                          │
                                    [Input Pelunasan]
                                          │
                                          └── LUNAS

[KAPAN SAJA]
  Owner bisa → BATAL (void, dengan alasan)
               Data tetap di database, hanya status berubah
               Transaksi BATAL tidak masuk perhitungan laporan
```

---

## 9. REFERENSI DESAIN

### File Referensi
- `kode/karyawan` — Dashboard karyawan (corporate dark style)
- `kode/owner` — Dashboard owner (cyber/neon futuristic style)

### Desain Final
Palet warna dan layout spesifik akan ditentukan oleh Google Stitch. PRD ini hanya memberikan garis besar fitur dan alur kerja.

---

## 10. FASE PENGEMBANGAN

| Fase | Nama | Estimasi |
|------|------|----------|
| 1 | Setup Database + Auth | 1 hari |
| 2 | Layout, Sidebar, Role Middleware | 1 hari |
| 3 | Customers CRUD | 1 hari |
| 4 | Products CRUD | 1 hari |
| 5 | Transactions CRUD + HPP + Pembayaran | 3 hari |
| 6 | Invoice PDF | 1 hari |
| 7 | Biaya Operasional CRUD | 1 hari |
| 8 | Dashboard Owner (Chart + KPI) | 2 hari |
| 9 | Dashboard Karyawan | 1 hari |
| 10 | Settings (Toko + User Management) | 1 hari |
| 11 | PWA + Deployment | 1 hari |
| | **Total** | **~14 hari** |

---

## 11. CATATAN TEKNIS

### Supabase Client
- Gunakan `@supabase/supabase-js` untuk koneksi
- Environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  ```
- Row Level Security (RLS) untuk proteksi data per role

### Auth
- Supabase Auth dengan email/password
- Middleware Next.js untuk proteksi halaman
- Session management via Supabase client

### PWA
- `next-pwa` atau `@serwist/next` untuk service worker
- `manifest.ts` untuk konfigurasi PWA
- Icon toko sebagai app icon

---

> **Dokumen ini adalah panduan pengembangan Mebel Online Monitoring.**  
> Setiap perubahan pada PRD harus didiskusikan dengan user sebelum diimplementasikan.