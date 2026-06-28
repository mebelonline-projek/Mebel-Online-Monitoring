# 🗺️ ROADMAP — Mebel Online Monitoring

> **Rencana Pengerjaan Aplikasi**  
> Manajemen Keuangan Toko Furnitur  
> Target: Owner + Karyawan  
> Tech Stack: Next.js + Supabase + Tailwind + Recharts

---

## Status Proyek

| Aspek | Status |
|-------|--------|
| **Fase Saat Ini** | 🟢 Fase 8 ✅ + Fase 11 ✅ (~95%) |
| **PRD** | ✅ Selesai |
| **Database** | ✅ 10 tabel + RLS + auto-generate trigger |
| **Database Schema Doc** | ✅ **`DB_SCHEMA.md`** — 8 tabel + kolom + RLS + trigger |
| **Known Bugs Doc** | ✅ **`docs/known-bugs.md`** — 9 bug pattern + checklist |
| **404 Fix (Cetak Nota & Pelunasan)** | ✅ `.single()`→`.maybeSingle()`, pisahkan error vs notFound, custom `not-found.tsx` + `error.tsx` |
| **Build Cache** | ✅ Bersihkan `next_corrupted`, `.next`, `node_modules/.cache` — tambah `.gitignore` |
| **Auth** | ✅ Login/register + middleware + role guard |
| **Transactions** | ✅ CRUD + HPP + DP/Cash + Pelunasan + Void |
| **Dashboard Owner** | ✅ KPI cards real data + ComposedChart + filter harian/mingguan/bulanan/tahunan + sparkline |
| **Dashboard Karyawan** | ✅ KPI cards + pending actions + recent transactions |
| **Invoice PDF** | ✅ Generate + preview + download |
| **Pengaturan Toko** | ✅ Info toko + upload logo (WebP kompresi) + reset logo |
| **Biaya Operasional** | ✅ CRUD simpel — 2 field (nama + jumlah), filter dropdown bulan |
| **Kelola User** | ✅ Owner bisa tambah/ubah/hapus karyawan via Admin API |
| **Mobile Header** | ✅ Redesain — dark mode toggle + Logout tombol outline |
| **TypeScript** | ✅ **0 error** (fix 2 implicit any) |
| **Build Status** | ✅ Lolos type-check (exit code 0) |

---

## Fase Pengembangan

### ✅ Fase 1-6: Selesai
Database, auth, layout, customers, products, transactions, invoice PDF, dashboard.

### ✅ Fase 7: Biaya Operasional CRUD
- **Redesain total** — schema simpel (nama + jumlah), dropdown bulan, tanpa kategori/period/note
- `lib/validation.ts`, `lib/operational-costs.ts`, `components/operational-costs/`, `app/(app)/operasional/`

### ✅ Fase 8: Dashboard Owner Polish
| Item | Status |
|------|--------|
| KPI Cards real data + trend | ✅ |
| ComposedChart (omzet + laba) | ✅ |
| Filter Harian/Mingguan/Bulanan/Tahunan | ✅ |
| Sparkline mini di KPI cards | ✅ |

### ⏳ Fase 9: Dashboard Karyawan Polish
| Item | Status |
|------|--------|
| KPI Cards real data | ✅ |
| Pending Actions clickable | ✅ |
| Recent Transactions | ✅ |

### ✅ Fase 10: Pengaturan + Kelola User
- Informasi toko + upload logo (dari Fase 6)
- **Kelola User baru** — tambah/ubah/hapus karyawan via Supabase Admin API
- Bypass RLS via service_role client
- Tab navigasi Info Toko ↔ Kelola User
- Tombol Logout di halaman Informasi Toko
- Tombol Kembali di halaman Kelola User

### ✅ Fase 11: PWA
| Item | Status |
|------|--------|
| Web App Manifest (`public/manifest.json`) | ✅ |
| App icons (`public/icons/`) | ✅ |
| PWA meta tags (apple-mobile-web-app) | ✅ |
| "Add to Home Screen" support | ✅ |

### ✅ Fase 11b: Production Readiness Audit
| Item | Status |
|------|--------|
| Audit schema vs kode | ✅ |
| Fix edit transaksi hapus riwayat pembayaran | ✅ |
| Halaman lupa password | ✅ |
| `.single()` → `.maybeSingle()` pada query sensitif | ✅ |
| Stat cards transaksi akurat | ✅ |
| Filter operasional overlap period_start/period_end | ✅ |
| Link daftar disembunyikan di production | ✅ |
| `DB_SCHEMA.md` invoices diupdate | ✅ |
| Production deployment | ⏳ |

---

## Timeline

| Fase | Status |
|------|--------|
| 1-6: Infrastruktur + Core | ✅ |
| 7: Biaya Operasional | ✅ |
| 8: Dashboard Owner | ✅ |
| 9: Dashboard Karyawan | ✅ |
| 10: Pengaturan + User | ✅ |
| 11: PWA | ✅ |
| 11b: Deployment Vercel | ⏳ |
| **Total** | **~95%** |

---

## Catatan Teknis — Untuk AI Chat Berikutnya

### File-file Baru
| File | Deskripsi |
|------|-----------|
| `lib/users.ts` | Kelola user — CRUD via admin client, bypass RLS |
| `lib/operational-costs.ts` | Server actions biaya operasional (simpel) |
| `components/operational-costs/` | Daftar biaya + dropdown bulan |
| `app/(app)/pengaturan/user/` | Halaman kelola user (owner only) |
| `app/(app)/operasional/` | Halaman biaya operasional |
| `app/not-found.tsx` | **BARU** Halaman 404 kustom dengan navigasi Kembali + Beranda |
| `app/(app)/transaksi/[id]/invoice/error.tsx` | **BARU** Error boundary halaman cetak nota |

### File yang Diubah
| File | Perubahan |
|------|-----------|
| `components/layout/mobile-header.tsx` | Tombol outline "Terang/Gelap" + "Log out" |
| `lib/validation.ts` | Schema `operationalCostSchema` simpel |
| `app/(app)/pengaturan/page.tsx` | Tab navigasi Info Toko ↔ Kelola User |
| `app/(app)/pengaturan/settings-client.tsx` | Tombol Logout |
| `lib/users.ts` | **Fix RLS bug** — semua query pakai admin client |
| `.env.local` | Tambah `SUPABASE_SERVICE_ROLE_KEY` |
| `app/(app)/transaksi/[id]/invoice/page.tsx` | **Fix 404** — `.single()`→`.maybeSingle()`, pisahkan error vs notFound |
| `app/(app)/transaksi/[id]/pelunasan/page.tsx` | **Fix 404** — `.single()`→`.maybeSingle()`, pisahkan error vs notFound |
| `.gitignore` | Tambah `next_corrupted`, `node_modules/.cache` |
| `docs/known-bugs.md` | Tambah bug #8 (404), #9 (build cache) |

### Bug & Fix
| Bug | Fix |
|-----|-----|
| "null value in column category" | Isi default `category: "LAINNYA"` saat insert |
| "tambah karyawan error" | Ganti `UPDATE` → `INSERT` ke `public.users`, semua query bypass RLS via admin client |
| Dashboard 404 | Server restart setelah perubahan `.env.local` |
| **Error 404 Cetak Nota & Pelunasan** | `.single()`→`.maybeSingle()`, pisahkan error (throw) vs notFound; custom `not-found.tsx` + `error.tsx` |
| **Build cache korupsi** | Hapus `next_corrupted`, `.next`, `node_modules/.cache` |

### Prinsip Pengerjaan
1. **Prioritas: P0 fungsional → P1 integrasi → P2 polish**
2. **Jangan rewrite yang sudah jalan** — fokus yang belum ada
3. **Minimalis:** loading/empty state cukup teks biasa
4. **Jangan buat shared component untuk 1x pakai**

### Next Steps
- ✅ Sparkline mini di KPI cards dashboard owner
- ✅ Filter harian/mingguan chart
- ✅ PWA (manifest + icons + meta tags)
- ⏳ Deployment ke Vercel
- ⏳ Build production verification
- ⏳ Testing (type-check + build check)