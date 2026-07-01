# 🐛 KNOWN BUG PATTERNS — Mebel Online Monitoring

> **File ini untuk AI agent.**  
> Baca ini dulu SEBELUM menulis kode baru — agar tidak mengulang bug yang sama.

---

## 📋 Daftar Bug yang Sudah Pernah Terjadi

| # | Bug | Penyebab | Solusi | File Terkait |
|---|-----|----------|--------|-------------|
| 1 | **`null value in column "category"`** saat insert `operational_costs` | Kolom `category` NOT NULL tanpa default, insert tidak mengisi `category` | ✅ **RESOLVED** — User sekarang bisa memilih kategori via input/chip-button di form, fallback tetap `"LAINNYA"` | `lib/operational-costs.ts`, `lib/validation.ts`, `components/operational-costs/operational-cost-list-client.tsx` |
| 2 | **`tambah karyawan error`** — UPDATE ke `public.users` gagal | Awalnya pakai UPDATE, padahal user baru belum ada di tabel → harus INSERT | Ganti `UPDATE` → `INSERT` ke `public.users` | `lib/users.ts` |
| 3 | **Dashboard 404** setelah deploy | `.env.local` tidak di-restart setelah tambah `SUPABASE_SERVICE_ROLE_KEY` | Restart server setelah ubah `.env` | — |
| 4 | **RLS policy blokir query `users`** | Query `users` pakai anon key, tapi RLS menghalangi akses langsung | Semua query `users` WAJIB pakai `createAdminClient()` (service_role) | `lib/users.ts` |
| 5 | **`auth.uid()` undefined** di fungsi `get_user_role()` | `search_path` diubah ke `''` — fungsi tidak bisa akses schema `auth` | **JANGAN** ubah `search_path` fungsi RLS | `supabase/migration.sql` |
| 6 | **Auto-invoice number `INV-` ada di tabel `transactions`** | Dulu invoice_number dan transaction_number tercampur | Migrasi V2: rename kolom + buat tabel invoices terpisah | `supabase/migrate_v2.sql` |
| 7 | **Error NOT NULL constraint saat hapus FK** | FK tidak pakai ON DELETE CASCADE | Tambah ON DELETE CASCADE ke FK `transaction_payments` dan `hpp_items` | `supabase/migrate_v2.sql` |
| 8 | **Error 404 pada Cetak Nota & Pelunasan** | `notFound()` dipanggil untuk SEMUA error (termasuk error sementara). `.single()` menghasilkan error jika data tidak ada. | Ganti `.single()` → `.maybeSingle()`, pisahkan error koneksi vs data tidak ditemukan | `app/(app)/transaksi/[id]/invoice/`, `app/(app)/transaksi/[id]/pelunasan/` |
| 9 | **Build cache korupsi (`next_corrupted`)** | Korupsi build cache turbopack menyebabkan `ensure-page` gagal | Bersihkan `.next` dan `node_modules/.cache` lalu restart dev server | Build cache |
| 10 | **Edit transaksi hapus semua riwayat pembayaran** | `updateTransaction()` DELETE semua `transaction_payments` lalu INSERT baru | UPDATE payment pertama yang ada, jangan DELETE+INSERT. Guardrail: blokir edit jika >1 payment atau MENUNGGU_PELUNASAN. | `lib/transactions.ts` |
| 11 | **Query `users` dengan anon key + `.single()`** | Query ke `public.users` pakai regular client (anon key). RLS blokir → `.single()` throw error 500. | Semua query `users` tanpa admin client → `.maybeSingle()`. Fallback null = pesan error aman, bukan crash. | `lib/transactions.ts`, `lib/operational-costs.ts`, `lib/supabase-server.ts` |
| 12 | **Stat cards transaksi tidak akurat** | Card "Lunas", "DP", dll menghitung dari data halaman saat ini (maks 10 item) | Fetch 4 count query terpisah di server page, kirim sebagai props ke client. | `app/(app)/transaksi/page.tsx`, `components/transactions/transaction-list-client.tsx` |
| 13 | **Filter biaya operasional pakai `created_at`** | Biaya difilter berdasarkan tanggal input, bukan periode biaya | Ganti ke overlap query: `lte("period_start", end) & gte("period_end", start)` | `app/(app)/operasional/page.tsx` |
| 14 | **Runtime Error — Event handler di Server Component** | `components/ui/button.tsx` tidak memiliki directive `"use client"`. Di Next.js 16, komponen dengan event handler wajib Client Component. | ✅ **FIXED** — `"use client"` sudah ditambahkan di semua UI components (`button.tsx`, `input.tsx`, dll) | `components/ui/button.tsx`, `components/ui/input.tsx` |
| 15 | **Console Error — Script tag di ThemeProvider** | Library `next-themes` v0.4.6 inject `<script>` tag. React 19 memberi warning. | ✅ **FIXED** — Sudah diganti custom ThemeProvider (`providers/theme-provider.tsx`) + `next/script` di layout | `providers/theme-provider.tsx`, `app/layout.tsx` |
| 16 | **MIDDLEWARE_INVOCATION_FAILED 500 di Vercel** | Next.js 16 deprecate `middleware.ts`, export function `middleware` tidak dikenali | ⚠️ **PENDING** — `middleware.ts` masih berfungsi tapi Next.js 16 memberi warning deprecation. Rename ke `proxy.ts` direncanakan tapi belum dilakukan. | `middleware.ts` |

---

## 🚫 Larangan Keras (Jangan Pernah Lakukan)

| Larangan | Kenapa |
|----------|--------|
| **Jangan query `public.users` dengan anon key** | RLS akan blokir — selalu pakai admin client |
| **Jangan ubah `search_path` fungsi `get_user_role()`** | Butuh akses schema `auth` untuk `auth.uid()` |
| **Jangan rewrite komponen yang sudah jalan** | Fokus selesaikan yang belum ada |
| **Jangan hapus properti `category` di insert `operational_costs`** | Kolom NOT NULL, pasti error |
| **Jangan rename kolom database tanpa migrasi SQL** | Schema sudah final, ubah kode bukan DB |
| **Jangan DELETE+INSERT payment saat edit transaksi** | Hapus riwayat pembayaran — UPDATE saja payment yang ada |
| **Jangan lupa `"use client"` di komponen dengan event handler** | Server Component tidak bisa terima `onClick`, `onChange`, dll |
| **Jangan pakai `.single()` untuk query SELECT** | Ganti ke `.maybeSingle()` + pisahkan error vs data kosong |

---

## ✅ Checklist Cegah Bug

Sebelum selesai coding, cek:

- [ ] Apakah insert ke `operational_costs` mengisi `category: "LAINNYA"`?
- [ ] Apakah query ke `users` pakai admin client (`createAdminClient()`)?
- [ ] Apakah ada perubahan `search_path` di fungsi SQL? (**JANGAN**)
- [ ] Apakah ada `console.log` yang perlu dihapus?
- [ ] Apakah semua komponen dengan event handler (`onClick`, `onChange`, dll) sudah punya `"use client"`?
- [ ] Apakah type-check lolos? (`npm run type-check`)
- [ ] Apakah ada hardcode string yang seharusnya di `config/`?
- [ ] Apakah query `.single()` di Server Component aman? Ganti ke `.maybeSingle()` + pisahkan error vs notFound