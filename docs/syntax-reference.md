# ⚡ SYNTAX REFERENCE — Teknologi Terinstal

> File ini untuk AI agent. Baca **sebelum** menulis kode yang pakai teknologi di bawah.
> Berisi sintaks AKTUAL berdasarkan `package.json` + source code yang sudah jalan.
> Jika ada teknologi baru yang tidak tercantum di sini, cek `package.json` dan file terkait.

---

## 1. Next.js 16.2.9 — App Router (RSC)

### Server Component (default — tanpa `"use client"`)
```tsx
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);  // ditangkap error.tsx
  if (!data) notFound();                      // 404 kustom
  return <div>...</div>;
}
```

### Client Component — WAJIB `"use client"` (baris pertama)
```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function MyClient() {
  const [x, setX] = useState(0);
  return <Button onClick={() => setX(x+1)}>Klik {x}</Button>;
}
```

### Server Action (`"use server"` di lib/ file)
```tsx
"use server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { z } from "zod";
import type { ActionState } from "@/types/common";

export async function doSomething(formData: z.infer<typeof mySchema>): Promise<ActionState> {
  try {
    const parsed = mySchema.safeParse(formData);
    if (!parsed.success) return { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors };
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };
    // ...logic...
    return { success: true, data: result };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}
```

### Error Boundary (`error.tsx`) + `not-found.tsx`
```tsx
"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="flex flex-col items-center gap-4 p-8"><h2>Gagal memuat data</h2><Button onClick={reset}>Coba Lagi</Button></div>;
}
```

---

## 2. React 19.2.4

### Aturan Khusus
- Jangan pakai `next-themes` — sudah diganti custom ThemeProvider di `providers/theme-provider.tsx`
- Init tema pakai `<Script id="theme-init" strategy="beforeInteractive">` di root layout
- Semua komponen dengan event handler (`onClick`, `onChange`, dll) WAJIB `"use client"`
- `children` type: `Readonly<{ children: React.ReactNode }>`

---

## 3. Supabase (@supabase/supabase-js ^2.108.2, @supabase/ssr ^0.12.0)

### Server Client (dari `lib/supabase-server.ts`)
```tsx
import { createServerSupabaseClient } from "@/lib/supabase-server";
const supabase = await createServerSupabaseClient();
```

### Admin Client (bypass RLS — untuk query `users`)
```tsx
import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### Aturan Query
| Kondisi | Pakai | Contoh |
|---------|-------|--------|
| Data **mungkin kosong** (detail by ID) | `.maybeSingle()` | `.eq("id", id).maybeSingle();` |
| Insert/update **pasti return** | `.single()` | `.insert({...}).select("id").single();` |
| Query `public.users` | **WAJIB admin client** + `.maybeSingle()` | Jangan pakai anon key! |
| Count | `.select("*", { count: "exact", head: true })` | `count: exact` |
| Pagination (0-index) | `.range(from, to)` | `.range(0, 9)` = item 1-10 |

### Error Handling Pattern
```tsx
const { data, error } = await supabase.from("tabel").select("*").eq("id", id).maybeSingle();
if (error) throw new Error(error.message);    // → error.tsx (Coba Lagi)
if (!data) notFound();                        // → not-found.tsx (404)
```

---

## 4. Tailwind CSS v4 (tailwindcss ^4, @tailwindcss/postcss ^4)

### Setup — Tidak ada tailwind.config.js
```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --radius-lg: var(--radius);
}
```

### Custom value — pakai CSS variables, bukan `theme()` atau config
```tsx
// ✅ BENAR — pakai CSS variable
<div className="bg-background text-foreground p-4">Card</div>
<div className="dark:bg-gray-900">Dark mode</div>

// ✅ Pakai color-mix untuk opacity variant
<div className="bg-primary/10">10% opacity primary</div>
```

### Padding halaman standar
```tsx
<div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
```

---

## 5. Zod ^4.4.3

### Schema Pattern
```tsx
import { z } from "zod";

export const mySchema = z.object({
  name: z.string().min(2, "Min 2 karakter").max(100),
  amount: z.coerce.number().min(1, "Harus > 0").max(999_999_999),
  type: z.enum(["A", "B"], { error: "Pilih tipe" }),
  note: z.string().max(500).optional().or(z.literal("")),
}).refine((data) => data.amount > 0, { message: "...", path: ["amount"] });

export type MyFormValues = z.infer<typeof mySchema>;
```

### Validasi di Server Action
```tsx
const parsed = mySchema.safeParse(formData);
if (!parsed.success) {
  return {
    success: false,
    message: "Validasi gagal",
    errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  };
}
const data = parsed.data;
```

---

## 6. shadcn/ui v4.11.0

### Import (dari `components/ui/`)
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Pattern — `data-slot` + `cn()`
```tsx
<Button variant="default" size="default" onClick={handleClick}>Simpan</Button>
<Button variant="destructive" size="sm">Hapus</Button>
<Button variant="outline" asChild><Link href="/">Kembali</Link></Button>
```

### Catatan
Semua komponen di `components/ui/` sudah punya `"use client"`, jadi aman dipanggil dari client component.

---

## 7. sonner ^2.0.7 — Toast

```tsx
import { toast } from "sonner";

toast.success("Berhasil disimpan");
toast.error("Gagal menyimpan");
toast("Informasi", { description: "Detail pesan" });
```
`<Toaster />` sudah ada di `app/layout.tsx` — tidak perlu di-import ulang.

---

## 8. react-hook-form ^7.80.0 + @hookform/resolvers ^5.4.0

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormValues } from "@/lib/validation";

const form = useForm<TransactionFormValues>({
  resolver: zodResolver(transactionSchema),
  defaultValues: { customer_name: "", final_price: 0, payment_type: "CASH", dp_amount: 0 },
});

<form onSubmit={form.handleSubmit(handleSubmit)}>
  <Input {...form.register("customer_name")} placeholder="Nama pelanggan" />
  {form.formState.errors.customer_name && <p className="text-destructive text-sm">{form.formState.errors.customer_name.message}</p>}
</form>
```

---

## 9. lucide-react ^1.21.0 — Ikon

```tsx
import { Plus, Search, Trash2, Pencil, Eye, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
// Ukuran diatur lewat class: <Plus className="size-4" /> (bukan props size)
```

---

## 10. Cheatsheet — 10 Aturan Paling Sering Dilanggar

| # | Aturan | Akibat jika dilanggar |
|---|--------|----------------------|
| 1 | Query `users` → **WAJIB admin client** | RLS block → crash 500 |
| 2 | Query by ID → `.maybeSingle()` (bukan `.single()`) | Crash 406/500 jika data kosong |
| 3 | Komponen dg event handler → WAJIB `"use client"` | Runtime error (Next.js 16) |
| 4 | Tdk ada `tailwind.config.js` → pakai `@theme` di CSS | Build gagal |
| 5 | Insert `operational_costs` → isi `category: "LAINNYA"` | NOT NULL constraint error |
| 6 | Edit transaksi → UPDATE payment, jangan DELETE+INSERT | Riwayat pembayaran hilang |
| 7 | Jangan ubah `search_path` fungsi RLS di SQL | `auth.uid()` undefined |
| 8 | Server Action → return `ActionState`, pakai `try/catch` | Error tidak tertangani |
| 9 | Padding halaman → `p-4 md:p-6 lg:p-8 max-w-7xl mx-auto` | Layout inkonsisten |
| 10 | Hapus `console.log` sebelum selesai | Polusi konsol produksi |

---

> **Cara pakai:** Sebelum menulis kode yang pakai Next.js/Supabase/Tailwind/dll, buka file ini dulu.
> Cari section yang relevan, copy pattern yang sudah ada. Jangan asumsi sintaks versi lama.
> Jika teknologi baru tidak ada di sini, cek `package.json` + file terkait untuk ekstrak pattern-nya.
