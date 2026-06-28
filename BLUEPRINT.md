# 🏗️ BLUEPRINT — Arsitektur Proyek

> **File ini adalah "bensin" untuk AI agent.**  
> Baca ini dulu untuk paham arsitektur, struktur, dan keputusan teknis proyek sebelum ngoding.
>
> **Cara pakai:** Setiap clone template ini untuk proyek baru, edit file ini sesuai visi proyek Anda.

---

## 📋 Daftar Isi

1. [Ringkasan Stack](#ringkasan-stack)
2. [📦 Yang Tersedia di Proyek Ini](#-yang-tersedia-di-proyek-ini)
3. [Struktur Folder](#struktur-folder)
4. [Penjelasan Setiap Folder/File](#penjelasan-setiap-folderfile)
5. [Keputusan Arsitektur](#keputusan-arsitektur)
6. [Data Flow](#data-flow)
7. [Aturan untuk AI Agent](#aturan-untuk-ai-agent)
8. [Yang Tersedia vs Yang Perlu Ditambahkan](#yang-tersedia-vs-yang-perlu-ditambahkan)

---

## Ringkasan Stack

| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| **Framework** | Next.js 16 | App Router, Server Components, Streaming |
| **UI Library** | React 19 | Dengan Server Components + Client Components |
| **Bahasa** | TypeScript 5 | Strict mode |
| **Styling** | Tailwind CSS v4 | Utility-first, CSS variables untuk theming |
| **UI Components** | Shadcn UI | 16 komponen siap pakai (radix-nova style) |
| **State Management** | React hooks + Context | Zustand/Redux belum dipasang (tambah jika perlu) |
| **Form & Validasi** | react-hook-form + Zod v4 | Schema-based validation |
| **Animasi** | framer-motion v12 | Untuk layout animations, page transitions |
| **Chart** | recharts v3.9 | Untuk dashboard/analytics |
| **Icons** | lucide-react v1.21 | 1000+ ikon |
| **Theming** | next-themes | Dark/light mode dengan CSS variables |
| **Font** | Geist Sans + Geist Mono | Google Fonts, dioptimalkan dengan next/font |
| **Notifications** | sonner v2 | Toast notifications |
| **Deployment** | Vercel (rekomendasi) | Atau server Node.js sendiri |

---

## 📦 Yang Tersedia di Proyek Ini

Semua sudah terinstall dan siap pakai. **Jangan install ulang!**

### 🎨 16 Komponen Shadcn UI

| Komponen | Import | Status |
|----------|--------|--------|
| **Avatar** | `@/components/ui/avatar` | ✅ Siap |
| **Badge** | `@/components/ui/badge` | ✅ Siap |
| **Button** | `@/components/ui/button` | ✅ Siap (dengan `asChild` untuk Link) |
| **Card** | `@/components/ui/card` | ✅ Siap (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter) |
| **Checkbox** | `@/components/ui/checkbox` | ✅ Siap |
| **Dialog** | `@/components/ui/dialog` | ✅ Siap (modal/dialog) |
| **Dropdown Menu** | `@/components/ui/dropdown-menu` | ✅ Siap (menu dropdown) |
| **Input** | `@/components/ui/input` | ✅ Siap |
| **Separator** | `@/components/ui/separator` | ✅ Siap (garis pemisah) |
| **Sheet** | `@/components/ui/sheet` | ✅ Siap (slide-over panel) |
| **Sidebar** | `@/components/ui/sidebar` | ✅ Siap (sidebar navigasi, kompleks) |
| **Skeleton** | `@/components/ui/skeleton` | ✅ Siap (loading placeholder) |
| **Sonner** | `@/components/ui/sonner` | ✅ Siap (toast provider) |
| **Table** | `@/components/ui/table` | ✅ Siap (Table, TableHeader, TableBody, dll) |
| **Tabs** | `@/components/ui/tabs` | ✅ Siap (tab navigasi) |
| **Tooltip** | `@/components/ui/tooltip` | ✅ Siap |

**Cara pakai:**
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Langsung pakai:
<Button variant="outline" size="sm">Klik Saya</Button>
<Card>
  <CardHeader><CardTitle>Judul</CardTitle></CardHeader>
  <CardContent>Isi card</CardContent>
</Card>
```

### 🔧 Utility Library

| File | Fungsi | Import |
|------|--------|--------|
| `lib/utils.ts` | Fungsi `cn()` untuk merge className | `import { cn } from "@/lib/utils"` |
| `lib/formatters.ts` | Format currency, date, number, percentage, truncate | `import { formatCurrency, formatDate } from "@/lib/formatters"` |
| `lib/api.ts` | Fetch wrapper dengan error handling | `import { api, get, post, put, patch, del } from "@/lib/api"` |
| `lib/validation.ts` | Zod schemas reusable | `import { emailSchema, contactFormSchema } from "@/lib/validation"` |

### 🪝 Custom Hooks

| Hook | Fungsi |
|------|--------|
| `use-mobile` | Deteksi apakah user pakai mobile (SSR-safe, breakpoint 768px) |
| `use-media-query` | Generic media query hook (parameter: query string) |

### 📐 Konfigurasi Terpusat

| File | Isi |
|------|-----|
| `config/site.ts` | Nama, deskripsi, url, author, mainNav, footerLinks, social, locale |
| `config/seo.ts` | OpenGraph default, Twitter Card, JSON-LD |

### 📊 Constants

| File | Isi |
|------|-----|
| `constants/index.ts` | PAGINATION (default 10, max 100), BREAKPOINTS (sm 640, md 768, lg 1024), FILE_LIMITS (max image 5MB, allowed types), STATUS, TIMEOUT (30s), RATE_LIMIT (100 req/min), PUBLIC_ROUTES |

### 🌗 Dark Mode

Sudah siap dengan next-themes + CSS variables di `globals.css`.
```tsx
// Pakai di komponen:
<div className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
```

### 🔒 Security Headers

Sudah dikonfigurasi di `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Struktur Folder

```
proyek-anda/                          ← Root proyek
├── AGENTS.md                         ← 🧠 KONSTITUSI AI (baca ini DULU!)
├── BLUEPRINT.md                      ← (file ini) Arsitektur proyek
├── ROADMAP.md                        ← Arah & milestone
├── CHANGELOG.md                      ← Log perubahan untuk AI agent
├── CLAUDE.md                         ← Pointer ke AGENTS.md
├── README.md                         ← Dokumentasi proyek
├── .env.example                      ← Contoh environment variables
├── .prettierrc                       ← Formatter config
├── package.json                      ← Dependencies & scripts
├── next.config.ts                    ← Next.js config + security headers
├── tsconfig.json                     ← TypeScript config (strict)
├── postcss.config.mjs                ← PostCSS config (Tailwind)
├── components.json                   ← Shadcn UI config
├── config/                           ← Konfigurasi terpusat
│   ├── site.ts                       ←   Nama, deskripsi, nav, sosial
│   └── seo.ts                        ←   SEO defaults
├── types/                            ← Shared TypeScript types
│   ├── common.ts                     ←   ApiResponse, PaginationParams, ActionState, dll
│   └── index.ts                      ←   Barrel export
├── providers/                        ← React context providers
│   ├── theme-provider.tsx             ←   Dark mode wrapper
│   └── index.ts                      ←   Barrel export
├── constants/                        ← Konstanta aplikasi
│   └── index.ts                      ←   Pagination limits, breakpoints, dll
├── lib/                              ← Utility functions
│   ├── utils.ts                      ←   cn() helper (clsx + tailwind-merge)
│   ├── formatters.ts                 ←   Format currency, date, number
│   ├── api.ts                        ←   Fetch wrapper dengan error handling
│   └── validation.ts                 ←   Zod schemas reusable
├── hooks/                            ← Custom React hooks
│   ├── use-mobile.ts                 ←   Deteksi mobile (SSR-safe)
│   └── use-media-query.ts            ←   Generic media query hook
├── components/                       ← React components
│   └── ui/                           ←   16 komponen Shadcn UI (JANGAN diedit manual!)
└── app/                              ← Next.js App Router
    ├── layout.tsx                    ←   Root layout + ThemeProvider
    ├── page.tsx                      ←   Halaman utama (ganti sesuai proyek!)
    ├── globals.css                   ←   CSS variables & Tailwind
    └── favicon.ico                   ←   Favicon
```

---

## Penjelasan Setiap Folder/File

### `AGENTS.md` — WAJIB BACA
Ini adalah **konstitusi proyek**. Semua AI agent WAJIB baca ini sebelum menulis SATU baris kode pun. Isinya:
- Pola pikir "Saya adalah Arsitek" — 5 pertanyaan sebelum coding
- CRUTD+ — setiap fitur harus lengkap (Create, Read, Update, List, Delete + validasi, error handling, loading, empty state, konfirmasi)
- Aturan Integrasi — jika ubah Modul A, update juga Modul B, C, D
- Aturan "Saya adalah User" — user adalah orang awam, jangan tebak, jelaskan dengan sederhana
- Aturan Sustainable — no TODO, no any type, fungsi <50 baris, komponen <200 baris, file <300 baris
- Aturan Desain — mobile-first, dark mode wajib, pakai token CSS yang ada
- Aturan Keamanan — validasi input, Zod, sanitasi output, no secrets in client
- Checklist 20+ poin sebelum selesai

### `config/` — Konfigurasi Terpusat
**Tujuan:** Biar AI agent cukup baca 1 file untuk semua konfigurasi, bukan 10 file.  
**Aturan:** Jangan pernah hardcode string di komponen. Semua string yang reusable taruh di sini.

### `types/` — Shared Types
**Tujuan:** Semua interface/type di satu tempat, biar gak ada duplikasi.  
**Yang ada:** `ApiResponse<T>`, `PaginationParams`, `PaginationMeta`, `PaginatedResponse<T>`, `ActionState<T>`, `SelectOption`, `BreadcrumbItem`, `NavItem`.

### `lib/` — Utility Functions
**Tujuan:** Fungsi murni (pure functions) tanpa JSX, biar AI agent bisa baca logic tanpa perlu parse JSX.  
**Aturan:** Setiap fungsi harus <50 baris, harus ada error handling, harus reusable.

### `hooks/` — Custom Hooks
**Tujuan:** State logic yang reusable, hindari duplikasi.  
**Catatan:** `use-mobile.ts` pakai `useSyncExternalStore` (bukan `useState`+`useEffect`) karena SSR-safe.

### `components/ui/` — Shadcn UI
**Aturan:** JANGAN edit manual. Kalau ada update dari Shadcn, replace file.  
**16 komponen siap pakai:** avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, separator, sheet, sidebar, skeleton, sonner, table, tabs, tooltip.

### `providers/` — React Context Providers
**Saat ini:** Hanya ThemeProvider untuk dark mode.  
**Jika perlu tambah:** AuthProvider, QueryProvider (React Query), dll.

### `app/` — Next.js App Router
- `layout.tsx` — Root layout, wrapping dengan ThemeProvider, metadata dari config
- `page.tsx` — Halaman utama (placeholder minimal, ganti sesuai proyek)
- `globals.css` — CSS variables untuk light/dark mode, Tailwind directives

---

## Keputusan Arsitektur

### 1. Kenapa Config Terpusat?
**Masalah:** AI agent harus baca banyak file untuk paham konteks.  
**Solusi:** Semua konfigurasi di `config/` — AI cukup baca 1-2 file.  
**Contoh:** Nama proyek, deskripsi, nav links, SEO — semua di `config/site.ts`.

### 2. Kenapa Types Shared?
**Masalah:** Type duplikasi dimana-mana, susah maintenance.  
**Solusi:** Semua type di `types/common.ts` — barrel export via `types/index.ts`.

### 3. Kenapa Logic di `lib/`?
**Masalah:** Logic bercampur dengan JSX, AI agent susah baca.  
**Solusi:** Fungsi murni (tanpa JSX) di `lib/` — AI agent bisa baca logic tanpa context switching.

### 4. Kenapa Pakai Shadcn UI?
**Alasan:** Komponen accessible, customizable dengan Tailwind, tree-shakeable.  
**Aturan:** Jangan buat komponen sendiri kalau sudah ada. Kalau perlu modifikasi, extend jangan edit original.

### 5. Kenapa Tidak Ada State Management Library?
**Alasan:** Belum tahu kebutuhan proyek. Untuk proyek kecil, React Context cukup. Untuk proyek besar, tambahkan Zustand atau Redux Toolkit nanti.

### 6. Kenapa Tidak Ada Database/Auth?
**Alasan:** Template ini infrastruktur murni. Database dan auth tergantung kebutuhan proyek. Lihat tabel [Yang Tersedia vs Yang Perlu Ditambahkan](#yang-tersedia-vs-yang-perlu-ditambahkan).

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Components (Server/Client)          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │ Komponen │ │ Komponen │ │ Komponen │ │ Komponen │ │  │
│  │  │  Server  │ │  Client  │ │   UI     │ │  Shared  │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Hooks & Utility Library                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │   hooks  │ │ lib/api  │ │lib/utils │ │lib/valida│ │  │
│  │  │          │ │ (fetch)  │ │ (cn())   │ │  (Zod)   │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Server Actions / API Routes (tambah sesuai kebutuhan)│  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │  │
│  │  │Database  │ │ Auth     │ │ External API         │  │  │
│  │  │(Prisma/  │ │(NextAuth │ │ (REST/GraphQL)       │  │  │
│  │  │  dll)    │ │ /Lucia)  │ │                      │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Catatan:** Untuk proyek baru, tinggal tambahkan database layer, auth, dan API routes sesuai kebutuhan.

---

## Aturan untuk AI Agent

### 🥇 Aturan Emas

1. **BACA AGENTS.md** — ini bukan saran, ini WAJIB
2. **BACA CHANGELOG.md** — paham history proyek
3. **Pakai komponen yang sudah ada** — jangan install ulang Shadcn UI
4. **Jangan hardcode** — semua string di config/site.ts
5. **CRUTD+** — setiap fitur harus lengkap
6. **Integrasi** — jika ubah A, update B, C, D

### ⚠️ Larangan

| ❌ Jangan | ✅ Lakukan |
|-----------|------------|
| Instal ulang Shadcn UI | Pakai dari `components/ui/` |
| Hardcode string di komponen | Tambah ke `config/site.ts` |
| `any` type | Buat interface/type |
| `console.log` di production | Pakai logger atau hapus |
| Fungsi >50 baris | Pecah jadi beberapa fungsi |
| Komponen >200 baris | Pecah jadi sub-komponen |
| File >300 baris | Pisah ke file terpisah |
| `// TODO: fix later` | Kerjakan sekarang |
| Default export | Gunakan named export |

### 📝 Cara Berkontribusi untuk AI Agent

1. Baca file-file kunci (AGENTS.md, BLUEPRINT.md, ROADMAP.md, CHANGELOG.md)
2. Pahami struktur folder — jangan buat file di tempat salah
3. Ikuti pola yang sudah ada (config terpusat, types shared, logic di lib/)
4. Selesaikan 1 fitur LENGKAP (CRUTD+) sebelum lanjut fitur berikutnya
5. Update CHANGELOG.md dengan perubahan yang dilakukan
6. Tanya user jika ada yang kurang jelas — jangan tebak

---

## Yang Tersedia vs Yang Perlu Ditambahkan

### ✅ Sudah Tersedia (Jangan Install Ulang)
- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS v4 + Shadcn UI (16 komponen)
- Dark mode (next-themes)
- Form + validasi (react-hook-form + Zod)
- Animasi (framer-motion)
- Chart (recharts)
- Ikon (lucide-react)
- Notifikasi (sonner)
- Utility library (api, formatters, utils, validation)
- Custom hooks (use-mobile, use-media-query)
- Security headers
- AGENTS.md + BLUEPRINT.md + ROADMAP.md + CHANGELOG.md

### ❌ Perlu Ditambahkan Sesuai Kebutuhan Proyek

| Kebutuhan | Rekomendasi |
|-----------|-------------|
| **Database ORM** | Prisma / Drizzle |
| **Database** | PostgreSQL / SQLite / Supabase / MongoDB |
| **Authentication** | NextAuth.js / Lucia Auth / Clerk / Supabase Auth |
| **File Upload** | Uploadthing / Uppy / Supabase Storage |
| **State Management** | Zustand / Redux Toolkit (untuk proyek besar) |
| **Testing** | Vitest + React Testing Library + Playwright |
| **E2E Testing** | Playwright / Cypress |
| **Monitoring** | Sentry |
| **Rate Limiting** | Upstash / Vercel KV |
| **Search** | Algolia / Meilisearch |
| **Email** | Resend / Nodemailer |
| **Payment** | Midtrans / Xendit / Stripe |
| **CMS** | Contentlayer / Sanity / Hygraph |
| **i18n** | next-intl / react-i18next |

---

> **Pesan untuk AI Agent:**  
> Kamu sekarang sudah paham arsitektur proyek ini. Ingat: **BACA AGENTS.md DULU** sebelum menulis kode. File itu adalah konstitusi. File ini adalah peta. Jangan tersesat.