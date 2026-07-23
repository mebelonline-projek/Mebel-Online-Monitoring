# PRD — Inventori & Multi Gudang (Draft)

> Status: **DRAFT** — menunggu konfirmasi klien sebelum implementasi.  
> Dibuat setelah fase optimasi performa monitoring keuangan.  
> Aplikasi inti saat ini: penjualan + keuangan toko furnitur (bukan WMS penuh).

---

## 1. Masalah bisnis

Klien butuh pencatatan stok gudang terpisah dari kasir/penjualan:

- Stok masuk & keluar
- Kategori barang
- Foto barang
- Multi gudang
- User khusus manajemen stok

Tanpa modul ini, stok hanya “di kepala” / spreadsheet, mudah mismatch antar gudang.

---

## 2. Pengguna & role (usulan)

| Role | Akses inventori |
|------|-----------------|
| **OWNER** | Full (gudang, barang, movement, laporan) |
| **GUDANG** (baru) | CRUD barang, kategori, foto; stok IN/OUT/TRANSFER; lihat stok semua gudang |
| **KARYAWAN** (kasir) | **Tidak write stok di MVP.** Opsional fase 2: lihat sisa stok read-only di kasir |

Catatan: role `GUDANG` menambah nilai `users.role` + RLS + sidebar. Perubahan sensitif — ikuti pola `get_user_role()` yang sudah ada (jangan ubah `search_path`).

---

## 3. Scope MVP vs non-MVP

### MVP (fase 1)

- Master **kategori** barang
- Master **barang** (nama, kategori, satuan sederhana, harga referensi opsional, **foto** WebP)
- Master **gudang** (≥2 gudang)
- **Stok per gudang** (qty)
- Movement: **IN** (masuk), **OUT** (keluar), **TRANSFER** antar gudang
- Riwayat movement (tanggal, user, qty, alasan, dari/ke gudang)
- Laporan sederhana: sisa stok per gudang / per barang
- Role OWNER + GUDANG

### Non-MVP (fase 2+)

- Potong stok otomatis saat transaksi/kasir
- Purchase order / supplier
- Barcode / SKU kompleks
- Stock opname workflow formal
- Multi-cabang multi-tenant
- Notifikasi stok minimum (boleh ditambah cepat jika klien minta)

### Keputusan produk penting (default draft)

**Penjualan TIDAK otomatis mengurangi stok di MVP.**  
Alasan: alur transaksi/HPP/invoice sudah stabil; coupling dini berisiko bug stok & laporan keuangan. Stok dioperasikan manual (atau transfer) oleh petugas gudang dulu.

---

## 4. Entitas data (usulan schema)

```text
product_categories     id, name, created_at
warehouses             id, name, address?, is_active, created_at
products (extend)      + category_id FK, photo_url, unit?, sku?
warehouse_stocks       warehouse_id, product_id, qty  (unique pair)
stock_movements        id, type IN|OUT|TRANSFER, product_id,
                       from_warehouse_id?, to_warehouse_id?,
                       qty, note?, created_by, created_at
storage bucket         product-photos (public, WebP)
```

Aturan:

- OUT: qty tidak boleh membuat stok negatif (tolak transaksi)
- TRANSFER: atomic — kurangi gudang asal, tambah gudang tujuan
- Foto: kompresi WebP (pola sama `lib/process-store-logo.ts`)

---

## 5. Layar utama

1. **Daftar Gudang** — tambah/edit gudang  
2. **Kategori** — CRUD sederhana  
3. **Barang** — list + modal/form + upload foto + filter kategori  
4. **Stok** — tabel produk × gudang (qty)  
5. **Mutasi** — form IN / OUT / TRANSFER + riwayat  
6. **Sidebar** — menu “Gudang” / “Stok” untuk OWNER & GUDANG  

Padding & UI mengikuti pola app (`p-4 md:p-6 lg:p-8`, shadcn, sonner).

---

## 6. Permission matrix (MVP)

| Aksi | OWNER | GUDANG | KARYAWAN |
|------|-------|--------|----------|
| Lihat stok | Ya | Ya | Tidak |
| Mutasi stok | Ya | Ya | Tidak |
| Kelola gudang/kategori/barang | Ya | Ya | Tidak |
| Hapus barang yang punya movement | Soft-block / konfirmasi | Sama | — |

---

## 7. Kriteria penerimaan (MVP)

- [ ] Bisa buat ≥2 gudang
- [ ] Bisa buat kategori + barang + upload 1 foto
- [ ] Stok masuk menambah qty di gudang dipilih
- [ ] Stok keluar mengurangi qty; gagal jika melebihi sisa
- [ ] Transfer memindahkan qty A→B dengan jejak riwayat
- [ ] Role GUDANG login dan hanya melihat menu inventori + (opsional) read transaksi sesuai kebijakan akhir
- [ ] Dark mode & mobile usable (375px)
- [ ] Tidak merusak kasir/transaksi/invoice yang sudah ada

---

## 8. Estimasi fase implementasi (setelah PRD disetujui)

| Fase | Isi | Perkiraan |
|------|-----|-----------|
| I | Schema + RLS + role GUDANG + seed 2 gudang | 2–4 hari |
| II | CRUD kategori/barang/foto + list stok | 3–5 hari |
| III | Mutasi IN/OUT/TRANSFER + riwayat | 3–5 hari |
| IV | QA + polish navigasi | 1–2 hari |

---

## 9. Hosting production (rekomendasi untuk klien)

Pemakaian ringan (&lt;5 user): **bukan Vercel Hobby** (non-komersial).

- **VPS Indonesia** (IDCloudHost / Dewaweb / Rumahweb), spek **~2 GB RAM**, **~Rp 50–90rb/bulan**
- Build di lokal/CI; di VPS hanya jalankan `next start` + Nginx + HTTPS
- **Supabase Free** untuk DB/Auth/Storage (upgrade jika foto gudang membesar)
- Total tipikal: **~Rp 50–100rb/bulan**

Detail lebih lengkap: lihat `docs/hosting-rekomendasi.md`.

---

## 10. Pertanyaan ke klien (sebelum coding)

1. Nama role petugas gudang & apakah boleh akses laporan keuangan?  
2. Satuan barang (pcs saja, atau meter/set)?  
3. Apakah perlu stok minimum / alert?  
4. Jumlah gudang awal (2 / 3 / lebih)?  
5. Konfirmasi: stok **tidak** otomatis ikut kasir di versi pertama — setuju?
