# Rekomendasi Hosting — Aplikasi Monitoring Toko

## Konteks

- App: Next.js (Node) + Supabase (DB/Auth/Storage)
- Pemakaian: ringan, perkiraan **&lt;5 user**
- Vercel **Hobby** tidak untuk komersial; Vercel Pro biasanya overkill biaya untuk skala ini

## Rekomendasi

| Item | Pilihan |
|------|---------|
| App hosting | **VPS Indonesia** (IDCloudHost / Dewaweb / Rumahweb) |
| Spek | **1–2 vCPU, 2 GB RAM, 20–40 GB disk** |
| Harga tipikal | **Rp 50–90rb / bulan** |
| Database | **Supabase Free** (tetap cloud) |
| Deploy | Build di PC/CI → upload; di VPS: Nginx + PM2 + `next start` + HTTPS |
| Domain | Opsional (~Rp 10–20rb/bulan jika dibagi tahunan) |

**Total realistis: ~Rp 50–100rb/bulan.**

## Hindari

- Shared hosting PHP/cPanel (tidak cocok Next.js)
- Build rutin di VPS 1–2 GB (lebih aman build di luar)
- Asumsi “gratis Vercel” untuk klien bisnis

## Kapan upgrade spek

Naik ke **4 GB RAM** jika: build di server, banyak foto barang, atau user bertambah signifikan.
