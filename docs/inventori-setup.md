# Inventori & Multi Gudang — Setup Backend

Jalankan file SQL berikut di **Supabase SQL Editor** (urut):

1. [`supabase/migrate_inventory.sql`](../supabase/migrate_inventory.sql)
2. [`supabase/fix_inventory_linter.sql`](../supabase/fix_inventory_linter.sql) — wajib jika migrasi sudah dijalankan sebelum harden keamanan
3. (opsional) [`supabase/fix_product_photos_no_size_limit.sql`](../supabase/fix_product_photos_no_size_limit.sql)

Isi migrasi:
- Role `GUDANG` pada `users.role`
- Tabel: `product_categories`, `warehouses`, `warehouse_stocks`, `stock_movements`
- Kolom produk: `category_id`, `photo_url`, `unit`, `min_stock`
- Kolom `transaction_items.warehouse_id`
- Fungsi `apply_stock_change` (atomic) — **EXECUTE hanya `service_role`**
- Bucket storage `product-photos` (tanpa policy SELECT publik / listing)
- Seed 2 gudang (Toko = penjualan, Gudang Utama)

Setelah SQL sukses:
1. Restart / refresh app
2. Login OWNER → menu **Gudang**
3. Buat kategori & barang (dengan gudang + stok awal opsional), mutasi IN, uji kasir potong stok
4. Pengaturan → User → tambah role **Gudang**
5. Database Linter: warning inventori hilang; sisa ~5 ditoleransi (lihat `CLAUDE.md`)

### Alur master barang (penting)

| Menu | Untuk apa |
|------|-----------|
| **Gudang → Barang / Kategori / Stok / Mutasi** | Sumber kebenaran master barang + stok |
| **Produk** | Katalog baca untuk Owner/Karyawan; tambah/edit lewat Gudang |

- Jangan bypass inventori: create produk wajib `category_id` + baris `warehouse_stocks`.
- Kasir memotong stok dari gudang penjualan (`is_sales_warehouse`) atau gudang per item.
- Edit transaksi **tidak** mengubah item/qty/stok — koreksi barang = void lalu buat baru.
- Void mengembalikan stok (`VOID_RESTORE`); error restore dilaporkan ke user.

### Validasi ID (Zod)

App memakai `dbId` / `dbIdSchema` di [`lib/validation.ts`](../lib/validation.ts): bentuk UUID Postgres `8-4-4-4-12`, **bukan** Zod 4 `.uuid()` yang RFC-strict (menolak seed ID lama dengan version/variant `0`). Seed baru (`seed_full_business_2_5y.sql`) memakai UUID versi `4` + variant `8`.

Matriks akses:
- OWNER: inventori + keuangan
- GUDANG: hanya inventori
- KARYAWAN: tanpa menu Gudang; kasir potong stok gudang penjualan

### Reset data simulasi (QA)

Untuk wipe data bisnis lalu seed ulang 2,5 tahun (semua fitur): jalankan `supabase/wipe_business_data.sql`, lalu `supabase/seed_full_business_2_5y.sql` (ganti `OWNER_UUID_HERE`). Checklist verifikasi: [`docs/qa-checklist.md`](./qa-checklist.md). Users & `store_settings` tidak dihapus.

**Catatan:** re-seed dengan UUID baru tidak wajib jika data QA lama masih dipakai — validasi app sudah longgar. Re-seed hanya jika ingin ID seed RFC-compliant dari awal.
