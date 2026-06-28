# 📋 CHANGELOG ARCHIVE — Mebel Online Monitoring

> Log perubahan lengkap dari versi awal hingga v3.1.0.
> Untuk log terkini, lihat `CHANGELOG.md`.

---

### [3.1.0] — 2026-06-26
#### 🛡️ Supabase Linter Warnings — 13 fix, 5 toleransi
- 8 warning berhasil dihilangkan (search_path, bucket policy, anon permissions)
- 5 warning ditoleransi (by design / false positive)

#### 🐛 Fixed
- Bug: SET search_path = '' mematahkan aplikasi — ditambah `'public, auth'`
- Bug: Tombol "Tambah pelanggan baru" 404 — redirect ke `/customer` (daftar)

### [3.0.0] — 2026-06-26
#### ✨ Fase 6: Invoice PDF + Upload Logo + Kompresi WebP (LENGKAP)
- Invoice PDF dengan @react-pdf/renderer + template logo toko
- Upload logo dengan kompresi WebP 90% (sharp)
- Halaman pengaturan toko + reset logo
- Supabase Storage bucket `logos` — public, WebP only

### [2.4.0] — 2026-06-25
#### ✨ Fase 5 Hari 3: Polish + Integrasi Dashboard
- Dashboard Owner: KPI Cards real data + ComposedChart + period filter
- Dashboard Karyawan: clickable links + pending actions
- 6 loading.tsx + 4 error.tsx baru
- Seed data 2.5 tahun deterministik

### [2.3.0] — 2026-06-25
#### ✨ Fase 5 Hari 2: HPP + Pembayaran + Edit + Void
- HPP items CRUD, Payment dengan auto-update status
- Halaman edit transaksi, kelola HPP, input pelunasan

### [2.2.0] — 2026-06-25
#### ✨ Fase 5 Hari 1: Transactions Core
- Server actions: create, get, update, void transaction
- Form transaksi reusable, daftar + detail transaksi

### [2.1.0] — 2026-06-25
#### 🐛 Fixed: Karyawan tidak bisa tambah customer
#### ✨ Fase 4: Products CRUD (LENGKAP)

### [2.0.0] — 2026-06-25
#### 🎨 Dual Theme System — Warm Wood ☀️ + Neon Tokyo 🌙

### [1.4.0] — 2026-06-25 — Style Konsisten
### [1.3.0] — 2026-06-25 — Fix Layar Hitam Blank
### [1.2.0] — 2026-06-25 — Referensi desain dashboard
### [1.1.0] — 2026-06-25 — Customers CRUD
### [1.0.1] — 2026-06-25 — Auto login, fix RLS register
### [1.0.0] — 2026-06-24 — Infrastruktur inti