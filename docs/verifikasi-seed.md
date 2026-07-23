# 📊 VERIFIKASI SEED DATA — Dashboard Owner

> **Tujuan:** Cross-check dashboard values vs expected values dari seed data.  
> **Akurasi target:** Selisih Rp 0 (zero tolerance) untuk semua metrik.  
> **Data:** 2.5 tahun (Jan 2024 – Jun 2026), ~2,700 transaksi.

---

## 🔍 Cara Verifikasi

### Step 1: Jalankan Seed
1. Dapatkan UUID OWNER: `SELECT id, email FROM auth.users LIMIT 1;`
2. Edit `supabase/seed_dummy.sql` — ganti `OWNER_UUID_HERE` dengan UUID dari step 1
3. Jalankan di Supabase SQL Editor

### Step 2: Verifikasi Data Mentah (SQL)
Jalankan query berikut untuk mendapatkan nilai expected yang PASTI:

```sql
-- ============================================================
-- A. TOTAL TRANSAKSI per status (non-BATAL)
-- ============================================================
SELECT 
  status,
  COUNT(*) as tx_count,
  SUM(final_price) as total_revenue
FROM transactions
WHERE status != 'BATAL'
GROUP BY status
ORDER BY status;
```

```sql
-- ============================================================
-- B. TOTAL HPP (dari semua transaksi non-BATAL)
-- ============================================================
SELECT 
  ROUND(SUM(h.amount)) as total_hpp
FROM hpp_items h
JOIN transactions t ON t.id = h.transaction_id
WHERE t.status != 'BATAL';
```

```sql
-- ============================================================
-- C. TOTAL BIAYA OPERASIONAL (semua)
-- ============================================================
SELECT 
  category,
  COUNT(*) as count,
  SUM(amount) as total
FROM operational_costs
GROUP BY category
ORDER BY category;
```

```sql
-- ============================================================
-- D. RINGKASAN PER BULAN (12 bulan terakhir)
-- ============================================================
SELECT
  TO_CHAR(DATE_TRUNC('month', tx.created_at), 'YYYY-MM') AS bulan,
  COUNT(*) FILTER (WHERE tx.status != 'BATAL') AS tx_count,
  SUM(tx.final_price) FILTER (WHERE tx.status != 'BATAL') AS revenue,
  ROUND(SUM(hpp.total_hpp)) AS total_hpp,
  ROUND(
    SUM(tx.final_price) FILTER (WHERE tx.status != 'BATAL') - SUM(hpp.total_hpp)
  ) AS gross_profit
FROM transactions tx
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(h.amount), 0) AS total_hpp
  FROM hpp_items h
  WHERE h.transaction_id = tx.id
) hpp ON true
WHERE tx.created_at >= '2025-07-01'
  AND tx.created_at < '2026-07-01'
GROUP BY DATE_TRUNC('month', tx.created_at)
ORDER BY bulan;
```

```sql
-- ============================================================
-- E. RINGKASAN PER TAHUN
-- ============================================================
SELECT
  EXTRACT(YEAR FROM tx.created_at) AS tahun,
  COUNT(*) FILTER (WHERE tx.status != 'BATAL') AS tx_count,
  SUM(tx.final_price) FILTER (WHERE tx.status != 'BATAL') AS revenue,
  ROUND(SUM(hpp.total_hpp)) AS total_hpp
FROM transactions tx
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(h.amount), 0) AS total_hpp
  FROM hpp_items h
  WHERE h.transaction_id = tx.id
) hpp ON true
WHERE tx.status != 'BATAL'
GROUP BY EXTRACT(YEAR FROM tx.created_at)
ORDER BY tahun;
```

```sql
-- ============================================================
-- F. JUMLAH TRANSAKSI + PELANGGAN + PRODUK
-- ============================================================
SELECT 
  (SELECT COUNT(*) FROM transactions) as tx_total,
  (SELECT COUNT(*) FROM transactions WHERE status != 'BATAL') as tx_aktif,
  (SELECT COUNT(*) FROM customers) as customer_count,
  (SELECT COUNT(*) FROM products) as product_count,
  (SELECT COUNT(*) FROM hpp_items) as hpp_item_count,
  (SELECT COUNT(*) FROM transaction_payments) as payment_count,
  (SELECT COUNT(*) FROM operational_costs) as op_cost_count;
```

---

## 📋 TABEL VERIFIKASI — Isi Manual Setelah Query

Setelah seed dijalankan, isi tabel di bawah dengan hasil query di atas:

### Ringkasan Data

| Metrik | Expected (approx) | Actual (dari query) | Match? |
|--------|-------------------|---------------------|--------|
| Total Transaksi | ~2,700 | | |
| Transaksi Aktif (non-BATAL) | ~2,565 | | |
| Total Revenue (non-BATAL) | ~Rp 10 M | | |
| Total HPP | ~Rp 5.5 M | | |
| Customers | 10 | | |
| Products | 5 | | |
| HPP Items | ~7,000 | | |
| Payments | ~4,000 | | |
| Operational Costs | ~120 | | |

### Per Tahun

| Tahun | Tx Count | Revenue | Total HPP | Gross Profit | Op Costs | Net Profit |
|-------|----------|---------|-----------|-------------|----------|------------|
| 2024 | | | | | | |
| 2025 | | | | | | |
| 2026 (Jan-Jun) | | | | | | |

### Per Bulan (12 bulan terakhir)

| Bulan | Tx | Revenue | HPP | Gross Profit |
|-------|-----|---------|-----|-------------|
| Jul 2025 | | | | |
| Agu 2025 | | | | |
| Sep 2025 | | | | |
| Okt 2025 | | | | |
| Nov 2025 | | | | |
| Des 2025 | | | | |
| Jan 2026 | | | | |
| Feb 2026 | | | | |
| Mar 2026 | | | | |
| Apr 2026 | | | | |
| Mei 2026 | | | | |
| Jun 2026 | | | | |

---

## 🧪 VERIFIKASI DASHBOARD (Setelah Integrasi)

### Owner Dashboard Checklist

| # | Item | Expected | Actual | OK? |
|---|------|----------|--------|-----|
| 1 | KPI: Total Revenue | = Query D kolom revenue (bulan ini) | | |
| 2 | KPI: Gross Profit | = Revenue - Query B | | |
| 3 | KPI: Net Profit | = Gross Profit - Query C (bulan ini) | | |
| 4 | KPI: Net Margin % | = (Net Profit / Revenue) × 100 | | |
| 5 | Trend MoM Revenue | = (Revenue bulan ini - Revenue bulan lalu) / Revenue bulan lalu × 100 | | |
| 6 | Chart Omzet Bar | = Query D kolom revenue per bulan | | |
| 7 | Chart Laba Kotor Line | = Query D kolom gross_profit per bulan | | |
| 8 | Recent Transactions | = 5 transaksi terbaru dari Query G | | |

### Karyawan Dashboard Checklist

| # | Item | Expected | Actual | OK? |
|---|------|----------|--------|-----|
| 1 | KPI: Tx Hari Ini | = COUNT today | | |
| 2 | KPI: Pending | = COUNT where status IN ('DP','MENUNGGU_PELUNASAN') | | |
| 3 | KPI: Completed | = COUNT today where status='LUNAS' | | |
| 4 | Recent Tx table | = 10 terbaru | | |

---

## 🐛 Jika Ada Selisih

| Selisih | Possible Cause |
|---------|---------------|
| Revenue tidak match | Filter status salah (termasuk BATAL) |
| HPP tidak match | JOIN query salah / tidak exclude BATAL |
| Net Profit tidak match | Biaya operasional tidak difilter per periode |
| Margin % tidak match | Pembagian integer (pakai FLOAT/NUMERIC) |
| Trend tidak match | Perbandingan bulan salah / NULL handling |
| Chart kosong | Data tidak ter-fetch / period filter salah |
| Tx hari ini = 0 | Timezone mismatch (created_at UTC vs local) |

---

## 📝 Catatan

1. **Nilai di atas adalah EXPECTED yang harus diisi manual** setelah menjalankan seed. Karena seed bersifat deterministik, query di atas akan menghasilkan angka yang persis sama setiap kali dijalankan dengan parameter yang sama.

2. **Verifikasi dilakukan SETELAH `getDashboardStats()` diimplementasikan** (item 2a-2c). Bandingkan output `getDashboardStats()` dengan query SQL langsung.

3. **Toleransi selisih: Rp 0.** Jika ada selisih, ada bug di query aggregasi.

4. **Untuk verifikasi chart:** Bandingkan data point chart dengan Query D (per bulan). Jumlah bar di chart harus = jumlah bulan di Query D.

---

> **Update terakhir:** 25 Jun 2026 — Dibuat bersama seed_dummy.sql