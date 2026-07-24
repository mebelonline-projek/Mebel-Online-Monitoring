# Plan Cadangan: VPS 1GB + Optimasi (Uji Per Jam)

> **Status:** rencana saja — belum diterapkan di kode/infra.  
> Dieksekusi hanya jika Vercel bermasalah **dan** klien setuju pindah ke VPS.

Dokumen terkait: [hosting-rekomendasi.md](./hosting-rekomendasi.md)

---

## 1. Kapan dijalankan

| Syarat | Keterangan |
|--------|------------|
| Vercel bermasalah | Limit bandwidth/function, pause app, atau kebijakan (mis. Hobby tidak untuk komersial) |
| Klien setuju VPS | Ada persetujuan biaya & tanggung jawab self-host |
| Sampai saat itu | Tetap **Vercel + Supabase** |

**Provider uji coba:** Nevacloud **Nevalite 1GB** (billing **per jam**) → mudah di-destroy atau di-upgrade ke **Nevalite 2GB** tanpa redesign aplikasi.

```text
Vercel bermasalah + klien OK
        │
        ▼
Siapkan repo deploy (lihat §4)
        │
        ▼
Nevalite 1GB per jam
        │
        ▼
Uji skenario toko (§6)
        │
   ┌────┴────┐
   │         │
 Lulus     Gagal (OOM / lambat / crash)
   │         │
   ▼         ▼
Tetap 1GB   Upgrade 2GB
atau langganan bulanan
```

---

## 2. Prinsip: UI/UX tidak dikorbankan

Lonjakan memori ditangani di **infrastruktur + concurrency server**, bukan dengan memotong fitur atau mengubah tampilan.

| Boleh | Tidak boleh |
|-------|-------------|
| Build di luar VPS, deploy artefak lean | Hapus / sederhanakan layar, animasi, atau fitur |
| Swap + limit heap Node | Turunkan kualitas visual yang terlihat user |
| Antrian 1 job berat (sharp / PDF) di server | Hilangkan PDF invoice / upload foto |
| Kompresi di client sebelum upload (sudah ada di inventori) | Memaksa user ubah alur kerja |
| `output: "standalone"` di Next.js | Rewrite UI |

---

## 3. Titik beban aktual di repo

| Area | File / lokasi | Catatan |
|------|---------------|---------|
| sharp | `lib/process-product-photo.ts`, `lib/process-store-logo.ts`, `lib/pwa-icons.ts` | Dipanggil dari settings / inventory |
| PDF | `lib/pdf-invoice.ts` (`renderInvoicePdfBuffer`) | Dynamic import sudah baik |
| Body besar | `next.config.ts` → `serverActions.bodySizeLimit: "8mb"` | Upload foto bisa membludak RAM |
| Sudah bantu UX + RAM | `components/inventory/product-inventory-client.tsx` → `compressPhotoForUpload` | Pertahankan pola ini |
| Belum ada | `output: "standalone"`, PM2/deploy script, mutex job berat | Disiapkan saat eksekusi plan |

Stack: Next.js 16 + Node 24 + Supabase (DB/Auth/Storage tetap di cloud; VPS hanya menjalankan app).

---

## 4. Optimasi terbaik (urutan saat eksekusi nanti)

### A. Deploy lean (paling penting untuk 1GB)

1. Tambah di `next.config.ts`: `output: "standalone"` (verifikasi build sekali di lokal/CI dengan Serwist + Node 24).
2. **Jangan pernah** `next build` di VPS 1GB. Build di PC atau CI.
3. Upload hanya: `.next/standalone`, `.next/static`, `public`, plus env production.
4. Jalankan `node server.js` via **PM2** dengan `--max-old-space-size=512` (sisakan RAM untuk OS + spike sharp).
5. Reverse proxy: **Nginx** + Let’s Encrypt. Satu proses Node di port internal (mis. 3000).

### B. OS VPS (saat uji per jam)

1. Ubuntu 24.04, swapfile **2GB**, `vm.swappiness=10`.
2. Install hanya: Node 24 (nvm), Nginx, PM2, Certbot — tanpa panel berat.
3. Firewall: port 22 / 80 / 443 saja.

### C. Memori aplikasi tanpa ubah UI

1. **Mutex / antrian job berat** (modul kecil, mis. `lib/heavy-job-queue.ts`): sharp upload + render PDF dijalankan **satu per satu**. UI tetap sama; request kedua menunggu di server. Timeout → `{ success: false, message: "..." }` (pola existing).
2. **Logo settings:** samakan kompresi client seperti inventori (canvas/WebP sebelum FormData). Hasil akhir tetap WebP kualitas tinggi seperti sekarang.
3. **Sharp:** tetap sharp. Set `sharp.concurrency(1)` di VPS 1GB agar tidak multi-thread boros RAM — output gambar tidak berubah.
4. **PDF:** biarkan dynamic import + stream (sudah ada); jangan menumpuk buffer ganda.
5. **Jangan turunkan** `MAX_SIDE` / quality WebP agresif kecuali uji 1GB gagal berulang pada upload — baru turun tipis (mis. quality 78→72) yang praktis tak terlihat.

### D. Artefak yang dibuat saat eksekusi (bukan sekarang)

- `ecosystem.config.cjs` (PM2)
- `scripts/deploy-vps.sh` (atau setara PowerShell/docs perintah)
- Contoh config Nginx
- Update singkat pointer di `docs/hosting-rekomendasi.md` ke dokumen ini (opsional)

---

## 5. Checklist infrastruktur uji per jam

1. Buat Nevacloud **Nevalite 1GB** (billing per jam), lokasi Jakarta.
2. Setup OS: swap 2GB, Node 24, Nginx, PM2, Certbot.
3. Salin env production dari Vercel (Supabase URL/keys, dll.) — **jangan commit secret**.
4. Build di lokal/CI → deploy artefak standalone.
5. Arahkan domain (atau uji via IP + hosts file dulu).
6. Jalankan skenario §6.
7. Putuskan: lanjut 1GB / upgrade 2GB / destroy VPS (hemat biaya jam).

**Rollback:** DNS kembali ke Vercel; VPS di-stop/destroy.

---

## 6. Skenario uji (Definition of Done 1GB)

Uji dengan 1–2 user (Owner / Karyawan):

1. Login, dashboard, navigasi semua menu  
2. CRUD transaksi + pelunasan  
3. Upload logo toko + upload foto produk (file HP asli)  
4. Generate / unduh PDF invoice  
5. PWA / reload offline ringan  
6. Monitor 15–30 menit: `free -h`, log PM2, tidak ada OOM killer  

| Hasil | Keputusan |
|-------|-----------|
| Tidak crash; response normal; sharp/PDF selesai &lt; ~15–20 detik | **Lulus 1GB** — boleh langganan bulanan atau tetap uji |
| Crash, OOM, atau sangat lambat di foto/PDF | **Upgrade Nevalite 2GB** — stack deploy sama, hanya naik RAM. Jangan paksa 1GB |

---

## 7. Yang tidak diubah

- Desain UI, alur UX, komponen shadcn, animasi  
- Supabase tetap DB / Auth / Storage  
- Fitur bisnis: transaksi, inventori, PDF, PWA  

---

## 8. Estimasi biaya uji

- Nevalite 1GB: cek harga jam terkini di Nevacloud (orde ~Rp70-an/jam).  
- Uji 2–4 jam ≈ ribuan rupiah, lalu destroy atau resize ke 2GB / paket bulanan.

---

## 9. Ringkasan keputusan

| Pertanyaan | Jawaban plan |
|------------|--------------|
| Harus VPS sekarang? | Tidak — cadangan saja |
| Spek uji pertama? | Nevalite **1GB** per jam + optimasi §4 |
| Jika kurang? | Upgrade **2GB** |
| UI/UX berubah? | Tidak |
| Apakah kode sudah diubah? | **Belum** — dokumen rencana saja |
