<!-- ============================================================ -->
<!-- 🧠 PUSAT KENDALI AI — BACA INI DULU SEBELUM NULIS KODE -->
<!-- ============================================================ -->

# 🧠 ATURAN UTAMA — Semua AI Agent WAJIB Baca

> File ini adalah konstitusi proyek. Semua AI agent WAJIB baca sebelum menulis SATU baris kode.
> Dokumentasi detail lain ada di `docs/` jika perlu.

---

## 1. 🎯 PRIORITAS: Selesaikan Fitur Bisnis Dulu

| Prioritas | Artinya |
|-----------|---------|
| 🔴 **P0: Fungsional** | Biaya Operasional, Kelola User/Karyawan |
| 🟡 **P1: Integrasi** | Dashboard, Sidebar, Navigasi |
| 🟢 **P2: Polish** | Animasi, Sparkline, Filter tambahan |
| ⚪ **P3: Eng** | PWA, Testing, Deployment |

**⚠️ STOP polis sampai semua P0 dan P1 selesai.** Jangan rewrite button/card/table.

---

## 2. 🏗️ GOLDEN RULE: Pahami Bisnis Sebelum Coding

Aplikasi ini untuk **toko furnitur**. User Owner dan Karyawan. Orang awam.

Sebelum coding, tanya:
1. Apa yang user **MINTA**? (eksplisit)
2. Apa yang user **BUTUHKAN**? (implisit — mereka tidak sadar)
3. Apakah fitur ini bekerja untuk **KEDUA role**? (Owner & Karyawan)
4. Apakah **navigasi efisien**? (0 kali pindah halaman yang tidak perlu)

### Entitas Bisnis — Jangan Tertukar
- **Transaksi** (`TRX-...`) = Catatan penjualan harian. **WAJIB.**
- **Nota/Receipt** (`NOTA-...`) = Bukti bayar. Auto-generate setiap transaksi. **WAJIB.**
- **Invoice/Faktur** (`INV-...`) = Surat tagihan resmi. **OPSIONAL**, 1 invoice bisa mencakup banyak transaksi.

> **Transaksi ≠ Invoice.** Jangan pernah campurkan keduanya.

---

## 3. 🔧 ATURAN KODE — 5 Aturan Besi

### 3a. Minimalis, Jangan Over-Engineering
- **Fungsional dulu**, polish belakangan
- Loading state: cukup `<p className="text-muted-foreground">Memuat...</p>` — jangan buat skeleton kompleks
- Empty state: cukup `<p className="text-muted-foreground">Belum ada data</p>` — jangan buat komponen khusus
- Toast: pakai `sonner.toast()` — jangan buat toast wrapper

### 3b. File Patokan
- `lib/` → logic murni (tanpa JSX). Fungsi < 80 baris.
- `components/` → React components. Komponen < 300 baris.
- `config/` → semua konfigurasi (jangan hardcode string)
- `types/` → shared types
- Hapus `console.log` sebelum selesai.

### 3c. Token Efficiency — Minimalis Bacaan
- File baru = kecil (< 150 baris). File besar = pecah.
- JANGAN buat barrel index.ts di setiap folder — cukup di folder utama.
- JANGAN buat komponen "shared" untuk 1x pakai — inline saja.

### 3d. Stack Wajib
- UI: Shadcn components (`components/ui/`) — jangan buat ulang
- Ikon: lucide-react
- Validasi: Zod schemas di `lib/validation.ts`
- Styling: Tailwind CSS variables (`bg-background`, `text-foreground`, dll)
- Dark mode: semua komponen support `dark:`
- Padding halaman: `p-4 md:p-6 lg:p-8 max-w-7xl mx-auto`

### 3e. Security & Error
- Input user: validasi Zod di server action
- Error: `try/catch` → return `{ success: false, message: "..." }`
- Secret: jangan hardcode, pakai `.env.local`
- `any` type: buat interface. Jika terpaksa, beri komentar.

### 3f. ⚡ Cek Syntax Reference Dulu Sebelum Nulis Kode
Sebelum menulis kode yang menggunakan **Next.js, React, Supabase, Tailwind, Zod, shadcn, sonner, react-hook-form, lucide-react**, atau teknologi lain yang tercantum:

1. **WAJIB** buka `docs/syntax-reference.md` — cari section yang relevan
2. Copy pattern yang sudah ada di sana (jangan pakai asumsi sintaks versi lama)
3. Jika teknologi tidak tercantum di `docs/syntax-reference.md`, cek `package.json` + file terkait untuk ekstrak pattern aktual
4. DILARANG asumsi sintaks berdasarkan proyek lain atau versi Next.js/React/Supabase lawas

> **Alasan:** Proyek ini pakai Next.js 16 + React 19 + Supabase v2 + Tailwind v4 + Zod v4 + shadcn v4 — semuanya punya sintaks spesifik. Pattern lama (tailwind.config.js, next-themes, .single()) sudah tidak berlaku.

---

## 4. 📋 FILE KUNCI — Cukup Baca Ini

| # | File | Untuk apa |
|---|------|-----------|
| 1 | **`DB_SCHEMA.md`** | **🗄️** Schema database lengkap — baca dulu sebelum query DB |
| 2 | **`docs/known-bugs.md`** | **🐛** Daftar bug yang sudah pernah terjadi — baca agar tidak ulangi |
| 3 | **`docs/syntax-reference.md`** | **⚡ BARU!** Sintaks aktual semua teknologi terinstal — cek sebelum nulis kode |
| 4 | `lib/transactions.ts` | CRUD transaksi + invoice + dashboard |
| 5 | `lib/validation.ts` | Semua Zod schemas |
| 6 | `lib/supabase-server.ts` | Koneksi DB server-side |
| 7 | `lib/settings.ts` | Server actions pengaturan toko |
| 8 | `lib/store-queries.ts` | Query functions (tanpa "use server") |
| 9 | `lib/customers.ts` | Server actions customer |
| 10 | `lib/users.ts` | Kelola user (CRUD via admin client, bypass RLS) |
| 11 | `lib/operational-costs.ts` | Server actions biaya operasional |
| 12 | `components/transactions/transaction-form.tsx` | Form transaksi (contoh pattern) |
| 13 | `app/(app)/layout.tsx` | Layout + role guard |
| 14 | `middleware.ts` | Auth middleware |
| 15 | `types/common.ts` | Shared types |

---

## 5. 📋 CHECKLIST CEPAT — Sebelum Selesai

- [ ] Fungsi utama jalan (Create/Read/List/Update/Delete)
- [ ] Validasi error muncul (Zod)
- [ ] Toast notifikasi (sonner)
- [ ] Dark mode ok
- [ ] Responsif mobile (cek di 375px)
- [ ] Tidak ada `console.log`, `any`, `// TODO`
- [ ] Tidak ada hardcode string
- [ ] Update sidebar/nav jika ada menu baru

---

## ⛔ DILARANG KERAS

1. **Jangan rewrite komponen yang sudah jalan** — fokus selesaikan yang belum ada
2. **Jangan buat loading/empty/error state fancy** — teks biasa sudah cukup
3. **Jangan buat shared component untuk 1x pakai** — inline saja
4. **Jangan install dep baru** — kecuali benar-benar perlu dan sudah dibahas

---

> **Ingat:** Owner peduli: "Apakah saya bisa lihat uang masuk hari ini?"
> Karyawan peduli: "Apakah saya bisa input transaksi dengan cepat?"
> Setiap baris kode harus jawab salah satu dari pertanyaan itu.

<!-- ============================================================ -->
<!-- END OF AGENTS.md — v5 (ringkas) -->
<!-- ============================================================ -->