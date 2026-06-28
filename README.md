# 🧱 Infrastruktur Proyek Next.js

**Template infrastruktur untuk memulai proyek Next.js dengan cepat.**  
Bukan template produk jadi — ini adalah **fondasi** yang berisi aturan, utilitas, dan konfigurasi yang siap pakai.

---

## 📋 Daftar Isi

1. [Apa Ini?](#apa-ini)
2. [Apa yang Ada di Sini?](#apa-yang-ada-di-sini)
3. [Cara Pakai](#cara-pakai)
4. [Untuk AI Agent](#untuk-ai-agent)
5. [Struktur Folder](#struktur-folder)
6. [Script yang Tersedia](#script-yang-tersedia)
7. [Penting untuk Proyek Baru](#penting-untuk-proyek-baru)

---

## Apa Ini?

Template ini adalah **starter infrastructure** yang berisi:

- ✅ **Aturan AI agent** — AGENTS.md (WAJIB dibaca sebelum coding)
- ✅ **Blueprint & Roadmap** — BLUEPRINT.md + ROADMAP.md untuk arah proyek
- ✅ **Log perubahan** — CHANGELOG.md untuk konteks AI lintas sesi
- ✅ **Konfigurasi terpusat** — config/, types/, constants/
- ✅ **Utility library** — lib/ (api wrapper, formatters, validasi Zod)
- ✅ **Custom hooks** — hooks/ (use-mobile, use-media-query)
- ✅ **16 komponen Shadcn UI** — components/ui/ siap pakai
- ✅ **Dark mode** — next-themes + CSS variables
- ✅ **Keamanan dasar** — Security headers, strict TypeScript
- ✅ **Dependencies lengkap** — Semua sudah terinstall, tinggal `npm install`

---

## Apa yang Ada di Sini?

### 📦 Dependencies Terinstall

| Kategori | Paket |
|----------|-------|
| **Framework** | Next.js 16, React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4, class-variance-authority, clsx, tailwind-merge |
| **UI Components** | Shadcn UI (16 komponen: avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, separator, sheet, sidebar, skeleton, sonner, table, tabs, tooltip) |
| **Icons** | lucide-react v1.21 |
| **Form & Validation** | react-hook-form, @hookform/resolvers, Zod v4 |
| **Animation** | framer-motion v12, tw-animate-css |
| **Chart** | recharts v3.9 |
| **Notifications** | sonner v2 |
| **Theming** | next-themes |
| **Font** | Geist Sans + Geist Mono (Google Fonts) |

### 🧩 Infrastruktur Inti

| Folder/File | Fungsi |
|-------------|--------|
| `AGENTS.md` | Konstitusi AI agent — baca ini DULU sebelum ngoding |
| `CHANGELOG.md` | Log perubahan — biar AI agent paham history proyek |
| `BLUEPRINT.md` | Arsitektur proyek — keputusan teknis & struktur |
| `ROADMAP.md` | Arah proyek — milestone & fase pengembangan |
| `config/` | Konfigurasi terpusat (site, SEO) |
| `types/` | Shared TypeScript types |
| `constants/` | Konstanta aplikasi (pagination, limits, dll) |
| `lib/utils.ts` | Fungsi `cn()` (clsx + tailwind-merge) |
| `lib/formatters.ts` | Format currency, date, number |
| `lib/api.ts` | Fetch wrapper dengan error handling |
| `lib/validation.ts` | Zod schemas reusable |
| `hooks/use-mobile.ts` | Deteksi mobile (SSR-safe) |
| `hooks/use-media-query.ts` | Generic media query hook |
| `providers/theme-provider.tsx` | Dark mode wrapper (next-themes) |
| `components/ui/` | 16 komponen Shadcn UI (JANGAN diedit manual) |

---

## Cara Pakai

### Clone untuk proyek baru

```bash
# Copy folder ini ke proyek baru
cp -r template-vibe-coding proyek-anda
cd proyek-anda

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Mulai development
npm run dev
```

### Setelah clone, lakukan ini:

1. **Baca AGENTS.md** — biar AI agent paham aturan main
2. **Edit BLUEPRINT.md & ROADMAP.md** — sesuaikan dengan visi proyek Anda
3. **Edit config/site.ts** — ganti nama, deskripsi, URL proyek
4. **Ganti app/page.tsx** — buat halaman sesuai kebutuhan proyek
5. **Siapkan database & auth** — lihat tabel [Penting untuk Proyek Baru](#penting-untuk-proyek-baru)

---

## Untuk AI Agent

### 🧠 Aturan Emas

1. **BACA AGENTS.md** sebelum menulis SATU baris kode pun
2. **BACA CHANGELOG.md** untuk paham history proyek
3. **BACA BLUEPRINT.md & ROADMAP.md** untuk paham arah proyek
4. **Pakai komponen yang sudah ada** — jangan instal ulang Shadcn UI
5. **Config terpusat** — jangan hardcode apapun
6. **CRUTD+** — setiap fitur harus lengkap (Create, Read, Update, List, Delete + validasi, error handling, loading, empty state)

### ⚠️ Jangan Lakukan Ini

- ❌ Jangan install ulang Shadcn UI — sudah ada 16 komponen
- ❌ Jangan install library yang sudah ada — cek package.json dulu
- ❌ Jangan hardcode string — pakai config/site.ts
- ❌ Jangan tinggalkan `console.log` di production
- ❌ Jangan buat komponen >200 baris atau file >300 baris

---

## Struktur Folder

```
proyek-anda/
├── AGENTS.md              ← 🧠 KONSTITUSI AI (baca ini dulu!)
├── BLUEPRINT.md           ← Arsitektur proyek
├── ROADMAP.md             ← Arah & milestone
├── CHANGELOG.md           ← Log perubahan
├── CLAUDE.md              ← Pointer ke AGENTS.md
├── .env.example           ← Contoh environment variables
├── config/
│   ├── site.ts            ← Nama, deskripsi, nav, sosial
│   └── seo.ts             ← SEO defaults
├── types/
│   └── common.ts          ← Shared types
├── providers/
│   └── theme-provider.tsx ← Dark mode wrapper
├── constants/
│   └── index.ts           ← Konstanta aplikasi
├── lib/
│   ├── utils.ts           ← cn() helper
│   ├── formatters.ts      ← Format tanggal, uang, angka
│   ├── api.ts             ← Fetch wrapper
│   └── validation.ts      ← Zod schemas
├── hooks/
│   ├── use-mobile.ts      ← Deteksi mobile
│   └── use-media-query.ts ← Media query hook
├── components/
│   └── ui/                ← 16 komponen Shadcn (jangan diedit!)
└── app/
    ├── layout.tsx         ← Root layout
    ├── page.tsx           ← Halaman utama (ganti sesuai proyek!)
    ├── globals.css        ← CSS variables & Tailwind
    └── favicon.ico
```

---

## Script yang Tersedia

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server (localhost:3000) |
| `npm run build` | Build production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Cek kode dengan ESLint |
| `npm run type-check` | Cek TypeScript |
| `npm run format` | Format semua file dengan Prettier |
| `npm run clean` | Bersihkan cache (.next, node_modules) |
| `npm run preview` | Build + start production |

---

## Penting untuk Proyek Baru

Template ini TIDAK include layanan eksternal (database, auth, upload, dll).  
Tambahkan sesuai kebutuhan:

| Kebutuhan | Rekomendasi |
|-----------|-------------|
| **Database** | Prisma ORM + PostgreSQL / SQLite / Supabase |
| **Authentication** | NextAuth.js / Lucia Auth / Clerk |
| **File Upload** | Uploadthing / Uppy / Supabase Storage |
| **Testing** | Vitest + React Testing Library + Playwright |
| **Monitoring** | Sentry |
| **Rate Limiting** | Upstash / Vercel KV |

> **Tip:** Edit `.env.example` dengan variable yang dibutuhkan sebelum mulai ngoding.

---

> **Dibuat dengan ❤️ untuk developer yang menghargai kualitas.**  
> "Write code for humans, optimize for AI."