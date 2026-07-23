# QA Checklist — Setelah Wipe + Seed Full Business

> Jalankan setelah `wipe_business_data.sql` + `seed_full_business_2_5y.sql`.  
> Query perhitungan detail: [verifikasi-seed.md](./verifikasi-seed.md).

---

## 0. Alur reset data

1. **Backup** jika perlu (jangan wipe production live tanpa backup).
2. Jalankan [`supabase/wipe_business_data.sql`](../supabase/wipe_business_data.sql).
3. Verifikasi kosong (section 1 di bawah).
4. Jalankan [`supabase/seed_full_business_2_5y.sql`](../supabase/seed_full_business_2_5y.sql) (auto ambil 1 user OWNER; jika ada lebih dari satu OWNER, isi `v_owner_text` dengan UUID).
5. Jika seed lama (sebelum fix `payment_date`): jalankan [`supabase/fix_payment_date_from_created_at.sql`](../supabase/fix_payment_date_from_created_at.sql) — tanpa ini dashboard Hari/Minggu/Bulan/Tahun terlihat sama & grafik 1 bar.
6. Jika seed berhenti sebelum hari ini: jalankan [`supabase/seed_extend_to_today.sql`](../supabase/seed_extend_to_today.sql) (atau `node scripts/seed-extend-to-today.cjs`) agar KPI Hari/Bulan terisi.
7. Lanjut checklist SQL + UI. Restart / hard-refresh app agar cache dashboard (5 menit) tidak menampilkan angka lama.

Tetap dipertahankan: `auth.users` / `public.users`, `store_settings`.

---

## 1. Pasca-wipe (semua = 0)

```sql
SELECT 'transactions' AS t, COUNT(*) FROM transactions
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'warehouse_stocks', COUNT(*) FROM warehouse_stocks
UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'operational_costs', COUNT(*) FROM operational_costs
UNION ALL SELECT 'users (tetap)', COUNT(*) FROM users;
```

- [ ] Semua tabel bisnis = 0; `users` > 0
- [ ] Dashboard Owner: omzet / KPI = 0

---

## 2. Pasca-seed — volume data

```sql
SELECT
  (SELECT COUNT(*) FROM customers) AS customers,
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM product_categories) AS categories,
  (SELECT COUNT(*) FROM warehouses) AS warehouses,
  (SELECT COUNT(*) FROM transactions) AS transactions,
  (SELECT COUNT(*) FROM transaction_items) AS tx_items,
  (SELECT COUNT(*) FROM hpp_items) AS hpp_items,
  (SELECT COUNT(*) FROM transaction_payments) AS payments,
  (SELECT COUNT(*) FROM invoices) AS invoices,
  (SELECT COUNT(*) FROM operational_costs) AS op_costs,
  (SELECT COUNT(*) FROM stock_movements) AS movements;
```

| Cek | Expected |
|-----|----------|
| customers | 10 |
| products | 7 |
| categories | 4 |
| warehouses | 2 (1 sales) |
| transactions | ~2.5k–3k |
| invoices | ≥ 1 |
| op_costs | ~30 bulan × 4–5 baris |

- [ ] Volume masuk akal
- [ ] `SELECT COUNT(*) FROM warehouses WHERE is_sales_warehouse;` = 1

---

## 3. Perhitungan dashboard vs SQL

Jalankan query A–E di [verifikasi-seed.md](./verifikasi-seed.md). Bandingkan dengan UI Dashboard Owner (filter harian / mingguan / bulanan / tahunan).

- [ ] Omzet non-BATAL = `SUM(final_price) WHERE status != 'BATAL'`
- [ ] Total HPP = jumlah `hpp_items` transaksi non-BATAL
- [ ] Biaya operasional per kategori = SQL section C
- [ ] Filter periode (bulan/tahun) cocok dengan `created_at`
- [ ] Selisih target: **Rp 0** untuk metrik utama

---

## 4. Fitur UI (smoke)

### Kasir / Transaksi
- [ ] List transaksi terisi; filter status (LUNAS / DP / MENUNGGU / BATAL)
- [ ] Detail transaksi: line items + gudang Toko
- [ ] Tambah transaksi baru potong stok gudang penjualan
- [ ] Fallback gudang: stok Toko kurang → pilih gudang lain (uji di UI)
- [ ] Pelunasan DP → status LUNAS
- [ ] Void → status BATAL + stok restore (jika transaksi baru)

### Invoice & HPP
- [ ] Invoice sample terlihat; buat invoice dari DP/MENUNGGU saja (bukan LUNAS)
- [ ] Halaman HPP transaksi: item biaya ada

### Inventori
- [ ] `/gudang` — 2 gudang, Toko = penjualan
- [ ] Kategori / Barang / Stok terisi
- [ ] Mutasi: IN opening, TRANSFER bulanan, SALE (≥ Juli 2025)
- [ ] Stok Toko & Utama > 0 (fallback bisa diuji)

### Role
- [ ] OWNER: keuangan + Gudang
- [ ] KARYAWAN: kasir tanpa menu Gudang; stok tetap terpotong
- [ ] GUDANG: inventori saja (jika user role sudah ada)

### Lainnya
- [ ] Biaya operasional list per bulan
- [ ] Login tetap jalan (users tidak terhapus)
- [ ] Logo / pengaturan toko tetap

---

## 5. Catatan

- `seed_dummy.sql` / `cleanup_seed.sql` tetap ada; jalur QA penuh = wipe + `seed_full_business_2_5y.sql`.
- Mutasi **SALE** detail hanya dari **2025-07-01**; histori lebih lama memakai IN/TRANSFER agregat.
- Invoice seed memakai transaksi **DP / MENUNGGU_PELUNASAN** (aturan app: LUNAS → pakai Nota, bukan Invoice).
