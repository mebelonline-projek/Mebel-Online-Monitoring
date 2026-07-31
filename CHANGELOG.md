# 📋 CHANGELOG — Mebel Online Monitoring

> **File ini adalah memori proyek untuk AI agent.**
> Setiap sesi chat baru, AI agent WAJIB baca ini dulu untuk paham konteks proyek.
> Log lama ada di `docs/changelog-archive.md`.

---

## 📌 Project State Summary

| Item | Status |
|------|--------|
| **Project Type** | Aplikasi Manajemen Keuangan Toko Furnitur (Mebel Online Monitoring) |
| **Stack** | Next.js 16 + React 19 + TypeScript 5 (strict) + Tailwind v4 |
| **Database** | Supabase PostgreSQL (10 tabel: products, customers, transactions, transaction_payments, hpp_items, operational_costs, store_settings, users, invoices, invoice_items) |
| **Auth** | Supabase Auth (email/password) + RLS per role |
| **UI Library** | Shadcn UI (16 komponen) |
| **Validation** | Zod v4 |
| **Theming** | Custom ThemeProvider (Context API + Script) — ☀️ Warm Wood light / 🌙 Neon Tokyo dark |
| **Chart** | recharts v3.9 |
| **Notifications** | sonner v2 (toast) |
| **Icons** | lucide-react v1.21 |
| **Font** | Manrope |
| **Image Processing** | sharp v0.33 (WebP compression 90%) |
| **PDF Generation** | @react-pdf/renderer v4 |
| **Supabase Storage** | Bucket `logos` — public, WebP only |
| **Progress** | 🟢 100% — Semua fase ✅ |
| **Deployment** | ✅ **Vercel** — Production live |
| **Build Status** | ✅ Lolos type-check (0 error) |

### 🧠 File Kunci untuk AI Agent

| # | File | Untuk apa |
|---|------|-----------|
| 1 | `lib/transactions.ts` | CRUD transaksi + invoice + dashboard |
| 2 | `lib/validation.ts` | Semua Zod schemas |
| 3 | `lib/supabase-server.ts` | Koneksi DB server-side |
| 4 | `lib/settings.ts` | Server actions pengaturan toko |
| 5 | `lib/store-queries.ts` | Query functions (tanpa "use server") |
| 6 | `lib/customers.ts` | Server actions customer |
| 7 | `lib/users.ts` | **BARU** Kelola user (CRUD via admin client) |
| 8 | `lib/operational-costs.ts` | **BARU** Biaya operasional (nama + jumlah saja) |
| 9 | `components/layout/mobile-header.tsx` | **EDIT** Header mobile + dark mode toggle + Logout |
| 10 | `components/operational-costs/operational-cost-list-client.tsx` | **BARU** Daftar biaya dengan dropdown bulan |
| 11 | `app/(app)/pengaturan/user/` | **BARU** Halaman kelola user |
| 12 | `app/(app)/operasional/` | **BARU** Halaman biaya operasional |

| | 13 | `providers/theme-provider.tsx` | **EDIT** Custom ThemeProvider (ganti next-themes) + export `useTheme` |
| | 14 | `providers/index.ts` | **EDIT** + export `useTheme` |
---

## 📝 Log Perubahan

### [8.1.0] — 2026-07-31 — Inventori: search stok, varian, UX Gudang/Kasir

Ringkasan sesi fitur klien di **Next** (produksi harian). SPA hanya catat roadmap parity — jangan ulang di SPA kecuali port modul gudang/kasir.

#### Fitur
- **Search + filter stok** di `/gudang/stok` (nama, kategori, warna/ukuran, Stok Menipis)
- **Varian produk** parent/child: SQL `parent_id`, `warna`, `ukuran` (`supabase/migrate_product_variants.sql` — **sudah dijalankan** di shared Supabase)
- Buat barang **dengan atau tanpa** varian; stok/kasir hanya leaf (child atau standalone)
- Stok awal saat create: gudang + qty (per varian jika bervarian)
- **Sesuaikan stok di edit** barang/varian lewat Mutasi IN/OUT (satu tombol **Simpan**)
- Kartu stok mobile bervarian: **satu kartu produk** + baris varian ringkas
- Hapus barang **boleh meski ada stok** (CASCADE); kategori & gudang tetap diblokir jika dipakai/ada stok

#### UX / perbaikan
- Ranking pencarian barang & stok: **nama produk → warna/ukuran → kategori**
- Ranking pencarian kasir (`SearchablePicker`): sama — nama produk utama diutamakan
- Mutasi: label **Masuk / Keluar / Pindah** (+ riwayat Penjualan / Batal transaksi)
- Subnav inventori: tab **Lokasi** (bukan “Gudang”); subtitle *Kelola barang dan stok*
- Hapus dual aksi **Terapkan stok** vs **Simpan** (membingungkan)

#### File kunci
| File | Peran |
|------|--------|
| `supabase/migrate_product_variants.sql` | Kolom varian (shared DB) |
| `lib/inventory.ts` | CRUD barang/varian + mutasi + hapus tanpa cek stok |
| `lib/inventory-helpers.ts` | `productDisplayName`, `productSearchScore`, parent/leaf helpers |
| `components/inventory/product-inventory-client.tsx` | UI barang + varian + edit+stok |
| `components/inventory/stock-matrix-client.tsx` | Matriks stok + search + kartu grup |
| `components/inventory/movement-client.tsx` | Form/riwayat Mutasi ID |
| `components/inventory/gudang-subnav.tsx` | Tab Lokasi/Kategori/Barang/Stok/Mutasi |
| `components/shared/searchable-picker.tsx` | Ranking pencarian picker |
| `components/transactions/line-items-editor.tsx` | Kasir: label varian + rank search |

#### Aturan bisnis (jangan dilanggar)
- Parent shell: tidak dijual, tidak punya stok; ubah stok lewat **edit tiap varian**
- Mutasi / Edge / SALE tetap per `product_id` leaf
- Kategori: tidak hapus jika masih dipakai barang
- Gudang: tidak hapus gudang penjualan / jika masih ada stok
- Riwayat transaksi aman saat hapus barang (`product_id` SET NULL)

#### Commits terkait (main)
`10983e8` → `846e7ed` → `7a9439d` → `97a5ba5` → `8ff99c1` → `7b1cddc`

---

### [8.0.0] — 2026-07-01 — ⚡ Optimistic Update (Instant Navigation)

#### 🆕 Fitur Baru: Optimistic Update — Navigasi Instan ke Halaman Detail
Setelah user submit form transaksi, halaman detail langsung render tanpa menunggu fetch dari database. Data transaksi dikirim via `sessionStorage` (sekali pakai, aman, tidak mengotori URL).

**Flow baru:**
```
Submit form → POST sukses → sessionStorage → router.push → Detail render INSTAN (~0ms)
```

**Sebelumnya:**
```
Submit form → POST sukses → router.push → Server fetch DB → render (~700ms)
```

#### 📄 File yang Diubah

| File | Perubahan |
|------|-----------|
| `components/shared/status-badge.tsx` | Tambah variant `"MENYIMPAN"` dengan spinner animasi (border-spin) |
| `components/transactions/transaction-form.tsx` | Setelah POST sukses → simpan data transaksi ke `sessionStorage("pending_trx")` + wrapped try/catch |
| `components/transactions/transaction-detail-client.tsx` | `useState<TransactionDetail>` lazy initializer — baca sessionStorage saat mount, hapus setelah dibaca |

#### 🛡️ Safety & Edge Cases
- **sessionStorage tidak tersedia** (private browsing, iOS Safari) → try/catch diam-diam, fallback ke data server
- **Data corrupt** → JSON.parse gagal → fallback ke data server
- **ID tidak match** → skip, pakai data server
- **Akses langsung via URL** → sessionStorage kosong → fallback normal
- **Form edit** → tidak menyentuh sessionStorage sama sekali
- **Transaksi gagal** → sessionStorage tidak ditulis, toast error muncul

#### 📊 Verifikasi
- ✅ `npm run type-check` — 0 error
- ✅ `npm run lint` — 0 error baru (1 warning pre-existing)
- ✅ `npm run build` — Compiled successfully, 30 routes

#### 📝 Catatan Arsitektur
- **Layer 2 (Optimistic List) ditunda** — Form dan list ada di halaman terpisah (`/transaksi/tambah` vs `/transaksi`). Saat form di-submit, list component sudah unmount. `useOptimistic` tidak bisa bekerja lintas halaman tanpa state management global.
- **Tidak ada library baru** — Menggunakan React 19 built-in (`useState` lazy init) + browser API (`sessionStorage`)
- **Tidak ada perubahan di server/DB** — Semua perubahan di client-side saja

---

### [5.1.0] — 2026-06-27 — Dokumentasi Schema + Bug Prevention

#### 📄 Dokumentasi Baru
- **`DB_SCHEMA.md`** — Dokumentasi lengkap 8 tabel + kolom + tipe data + RLS + trigger
- **`docs/known-bugs.md`** — 7 bug pattern yang sudah terjadi + penyebab + solusi + checklist cegah bug
- **`AGENTS.md`** — Update referensi file kunci (14 file, + DB_SCHEMA.md, known-bugs.md, lib/users.ts, lib/operational-costs.ts)

#### 🐛 Fix TypeScript Errors
- **`app/(auth)/login/page.tsx`** — Fix 2 error:
  - `useState(null)` → `useState<string | null>(null)` (inferred type terlalu sempit)
  - Parameter `(e)` → `(e: React.FormEvent<HTMLFormElement>)` (implicit any)
- **Type-check:** `npx tsc --noEmit` ✅ 0 error, exit code 0

### [5.0.0] — 2026-06-27 — Restrukturisasi + 2 Fitur Baru

#### 📄 Dokumentasi
- **AGENTS.md** dipangkas 551 → ~140 baris (fokus esensial, buang CRUTD+ panjang)
- **CHANGELOG.md** diringkas, log lama pindah ke `docs/changelog-archive.md`
- **ROADMAP.md** diupdate — 85% selesai

#### 🆕 Fase 7: Biaya Operasional CRUD (redesain)
- **Schema:** Hanya `name` + `amount` (buang kategori, period, note)
- **Filter:** Dropdown 12 bulan terakhir — lihat biaya per bulan
- **Form:** 2 field (nama, jumlah) — simpel & cepat
- **Fix:** Error NOT NULL constraint — isi default `category: "LAINNYA"`
- **File:** `lib/validation.ts`, `lib/operational-costs.ts`, `components/operational-costs/operational-cost-list-client.tsx`, `app/(app)/operasional/page.tsx`

#### 🆕 Fase 10: Kelola User/Karyawan
- **Tambah karyawan:** Via Auth admin API (skip email confirm)
- **Edit nama karyawan:** Owner only
- **Hapus karyawan:** Hapus dari Auth + tabel users
- **Fix bug RLS:** Semua query pakai admin client (bypass RLS)
- **Fix bug insert:** Ganti `UPDATE` → `INSERT` ke `public.users`
- **Set `SUPABASE_SERVICE_ROLE_KEY`** di `.env.local`
- **Tombol Kembali** di halaman kelola user
- **Tombol Logout** di halaman Informasi Toko
- **File:** `lib/users.ts`, `app/(app)/pengaturan/user/`, `.env.local`

#### 🎨 Mobile Header Redesain
- Dark mode toggle: button outline dengan tulisan "Terang"/"Gelap"
- Logout: button outline merah dengan tulisan "Log out"
- Berlaku untuk semua role (Owner & Karyawan)
- **File:** `components/layout/mobile-header.tsx`

---

### [6.0.0] — 2026-06-27 — Sparkline + Filter Harian/Mingguan + PWA

#### 🆕 Dashboard Owner Polish (Fase 8/11)
- **Filter Harian/Mingguan** — Tambah filter `daily` (30 hari) dan `weekly` (12 minggu) di dashboard owner
- **Chart data** — `getDashboardStats()` support semua 4 periode: daily, weekly, monthly, yearly
- **Sparkline** — SVG sparkline mini di setiap KPI card (revenue, gross profit, net profit, margin)
- **Filter UI** — 4 tombol filter (Harian/Mingguan/Bulanan/Tahunan) dengan highlight aktif

#### 🆕 PWA Support (Fase 11)
- **manifest.json** — Web App Manifest di `public/manifest.json`
- **Ikon** — SVG ikon di `public/icons/icon-192.svg`
- **Root layout** — Meta tag PWA + manifest link + apple-mobile-web-app
- **File:** `public/manifest.json`, `public/icons/`, `app/layout.tsx`

#### 🆕 Komponen Baru
- **`components/dashboard/sparkline.tsx`** — Komponen Sparkline SVG murni (tanpa library)

#### 🔧 Perubahan
- **`lib/transactions.ts`** — `getDashboardStats()` support PeriodType (daily/weekly/monthly/yearly), helper `aggregateRange()` untuk deduplikasi logic
- **`app/(app)/dashboard/owner/page.tsx`** — Redesain dengan filter 4 periode + sparkline + periodLabel
- **`app/(app)/dashboard/owner/owner-chart.tsx`** — Props baru `period` untuk fleksibilitas chart
- **`app/layout.tsx`** — PWA meta tags + manifest link

---

### [7.0.0] — 2026-06-27 — Fix 404 Error Cetak Nota & Pelunasan

#### 🐛 Fix Error 404 Berulang pada Cetak Nota & Pelunasan

**Akar Masalah #1 — `notFound()` Terlalu Agresif:**
- Kedua halaman (`invoice/page.tsx` & `pelunasan/page.tsx`) menggunakan `.single()` yang menghasilkan error untuk SEMUA kasus (data tidak ada, network timeout, RLS block, dll)
- `notFound()` dipanggil untuk error koneksi sementara → user lihat halaman 404 padahal transaksi ada

**Perbaikan:**
- Ganti `.single()` → `.maybeSingle()` pada kedua halaman
- Pisahkan logika: error koneksi → `throw Error()` (ditangkap `error.tsx` dengan tombol Coba Lagi) vs data tidak ditemukan → `notFound()` (404 kustom)
- **File:** `app/(app)/transaksi/[id]/invoice/page.tsx`, `pelunasan/page.tsx`

**Akar Masalah #2 — Tidak Ada Error Boundary & Custom 404:**
- Halaman invoice tidak punya `error.tsx` — error langsung tampil sebagai 404
- Tidak ada `app/not-found.tsx` — 404 tampil sebagai halaman Next.js bawaan (minimal)

**Perbaikan:**
- **BARU** `app/(app)/transaksi/[id]/invoice/error.tsx` — Error boundary dengan tombol Coba Lagi + Kembali
- **BARU** `app/not-found.tsx` — Halaman 404 kustom dengan navigasi Kembali + Beranda

**Akar Masalah #3 — Build Cache Corruption:**
- Direktori `next_corrupted` + korupsi `.next`/turbopack menyebabkan `ensure-page` gagal
- `next build` & `npx tsc --noEmit` ✅ sukses setelah cache dibersihkan

**File baru:**
- `app/not-found.tsx`
- `app/(app)/transaksi/[id]/invoice/error.tsx`

**File diubah:**
- `app/(app)/transaksi/[id]/invoice/page.tsx`
- `app/(app)/transaksi/[id]/pelunasan/page.tsx`
- `.gitignore` (tambah `next_corrupted`, `node_modules/.cache`)
- `docs/known-bugs.md` (tambah bug #8, #9)

---

### [7.1.0] — 2026-06-28 — Production Readiness Audit & Fix

#### 🔴 Fix Kritis
- **Edit transaksi hapus riwayat pembayaran** — `updateTransaction()` dulu DELETE semua payments lalu INSERT baru. Sekarang UPDATE payment pertama yang sudah ada tanpa hapus apapun. Guardrail tetap ada (blokir MENUNGGU_PELUNASAN & >1 payment).
- **Halaman `/lupa-password` tidak ada** — Dibuat halaman reset password via Supabase `resetPasswordForEmail()`. User yang lupa password sekarang bisa reset.
- **Middleware blokir `/lupa-password`** — Tambah `/lupa-password` ke daftar halaman publik.

#### 🟠 Fix Tinggi
- **Query `users` dengan anon key + `.single()`** — Semua query `users` di `lib/transactions.ts` dan `lib/operational-costs.ts` diganti `.single()` → `.maybeSingle()`. Mencegah crash 500 jika RLS blokir.
- **`getUserProfile()` crash 500** — Ganti `.single()` → `.maybeSingle()`. User di `auth.users` tapi tidak di `public.users` tidak lagi menyebabkan crash.
- **`getStoreSettings()` crash 500** — Ganti `.single()` → `.maybeSingle()` + hapus `console.error`. Tabel kosong → return null gracefully.
- **Stat cards transaksi hitung per-halaman** — Tambah 4 query count terpisah (`lunasCount`, `dpCount`, `menungguCount`, `batalCount`) di server page. Client component sekarang menerima count akurat.
- **Status `MENUNGGU_PELUNASAN` reset ke `DP`** — Simplified status logic di `updateTransaction`. CASH → LUNAS, DP → DP.

#### 🟡 Fix Medium
- **Filter operasional pakai `created_at`** — Ganti menjadi overlap query `period_start` / `period_end`. Biaya yang period-nya beda dengan tanggal input sekarang muncul di bulan yang benar.
- **Link "Daftar" di production** — Sekarang disembunyikan jika `allowPublicRegister=false` (production default).
- **Schema `invoices` di `DB_SCHEMA.md` outdated** — Tambah kolom `status`, `total_amount`, `total_paid`, `remaining_amount` yang sudah ada di database.

#### File diubah
- `lib/transactions.ts`
- `lib/supabase-server.ts`
- `lib/operational-costs.ts`
- `lib/store-queries.ts`
- `components/transactions/transaction-list-client.tsx`
- `app/(app)/transaksi/page.tsx`
- `app/(app)/operasional/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/lupa-password/page.tsx` (**BARU**)
- `middleware.ts`
- `DB_SCHEMA.md`

---

### [7.4.0] — 2026-06-28 — Fix .single() → .maybeSingle() + admin client + known-bugs cleanup

#### 🔴 Fix Kritis
- **`components/ui/input.tsx` tanpa `"use client"`** — Komponen ini menyebarkan event handler (`onChange`, `onBlur`, `value`) via `{...props}`. Di Next.js 16 RSC, komponen tanpa `"use client"` tidak bisa menerima event handler. Sudah ditambahkan directive `"use client"` di baris pertama.
- **`lib/transactions.ts` — 8x `.single()` → `.maybeSingle()`** — Semua query SELECT by ID yang bisa mengembalikan 0 baris kini pakai `.maybeSingle()` dengan pola: `if (error) return; if (!data) return "tidak ditemukan"`. Fungsi yang diubah: `getTransactionById`, `updateTransaction`, `voidTransaction`, `deleteTransactionPermanent`, `addHppItem`, `updateHppItem`, `addPayment`, `getInvoiceById`.
- **`lib/users.ts` — `createUser()` pakai anon key** — Role check di `createUser()` dulu pakai `createServerSupabaseClient()` (anon key). Sekarang diganti `createAdminClient()` (service_role) + `.maybeSingle()` — konsisten dengan `updateUser()` dan `deleteUser()`.
- **`lib/users.ts` — 4x `.single()` → `.maybeSingle()`** — Semua role check (`createUser`, `updateUser`, `deleteUser`) dan target lookup (`deleteUser`) kini pakai `.maybeSingle()` + proper `error` handling. Hapus import `createServerSupabaseClient` yang tidak terpakai.

#### 🟡 Fix Medium
- **`docs/known-bugs.md` — Data korup & duplikasi** — Tabel format diperbaiki (baris 25-26, 41), checklist dirapikan (baris 55-58), 3x duplikasi bug #16 dihapus. Bug #14 (`"use client"` button.tsx) dan #15 (ThemeProvider script tag) diupdate status menjadi ✅ FIXED. Bug #16 (MIDDLEWARE_INVOCATION_FAILED) diupdate status menjadi ✅ FIXED. Tambah larangan baru: "Jangan pakai `.single()` untuk query SELECT".

#### File diubah
- `components/ui/input.tsx`
- `lib/transactions.ts`
- `lib/users.ts`
- `docs/known-bugs.md`

> **Prioritas selanjutnya:** 🚀 Production Deployment

### [7.2.0] — 2026-06-28 — Fix React 19 + Next.js 16 Runtime Error

#### 🔴 Fix Kritis
- **Runtime Error — Event handler di Server Component** — `components/ui/button.tsx` tidak memiliki directive `"use client"`. Di Next.js 16 (RSC), component yang menerima event handler (`onClick`, dll) harus Client Component. Semua `<Button onClick={...}>` sekarang berfungsi normal.
- **Console Error — Script tag di ThemeProvider** — Library `next-themes` v0.4.6 inject `<script>` tag di dalam React component. React 19 memberi warning. Solusi:
  - **Ganti `next-themes`** → Custom ThemeProvider (React Context API) tanpa script injection
  - **Tambah `<Script>`** dari `next/script` di root layout dengan `strategy="beforeInteractive"` untuk theme initialization sebelum React hydration
  - **Import path** 3 file diubah: `"next-themes"` → `"@/providers/theme-provider"`

#### File diubah
- `components/ui/button.tsx` — + `"use client"`
- `providers/theme-provider.tsx` — Rewrite: custom context, tanpa `next-themes`
- `providers/index.ts` — + export `useTheme`
- `app/layout.tsx` — + import `Script` + `<Script>` theme init
- `components/layout/app-sidebar.tsx` — Import: `next-themes` → `@/providers/theme-provider`
- `components/layout/mobile-header.tsx` — Import: `next-themes` → `@/providers/theme-provider`
- `components/ui/sonner.tsx` — Import: `next-themes` → `@/providers/theme-provider`

---

### [7.3.0] - 2026-06-28 - Fix Vercel Deployment 
 
#### Fix Kritis 
- Build Error app/not-found.tsx missing use client - Tambah directive. 
- MIDDLEWARE_INVOCATION_FAILED di Vercel - Rename middleware.ts ke proxy.ts. 
- Framework null di Vercel - Set Framework Preset Next.js + NEXT_PUBLIC_SITE_URL. 
- Git init + push 303 files ke repo Mebel-Online-Monitoring. 
 
