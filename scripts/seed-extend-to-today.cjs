/**
 * Extend seed transactions from day-after-max to today (WIB).
 * Mirrors supabase/seed_extend_to_today.sql via Supabase client.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(file) {
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const WH_UTAMA = "20000000-0000-0000-0000-000000000001";
const WH_TOKO = "20000000-0000-0000-0000-000000000002";
const CUST_IDS = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
  "00000000-0000-0000-0000-000000000003",
  "00000000-0000-0000-0000-000000000004",
  "00000000-0000-0000-0000-000000000005",
  "00000000-0000-0000-0000-000000000006",
  "00000000-0000-0000-0000-000000000007",
  "00000000-0000-0000-0000-000000000008",
  "00000000-0000-0000-0000-000000000009",
  "00000000-0000-0000-0000-000000000010",
];
const CUST_NAMES = [
  "Budi Setiawan",
  "Siti Nurhaliza",
  "Ahmad Fauzi",
  "Dewi Sartika",
  "Rudi Hermawan",
  "Linda Kusuma",
  "Bambang Prasetyo",
  "Ratna Sari",
  "Hendra Gunawan",
  "Mega Wati",
];
const PROD_IDS = [
  "10000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000002",
  "10000000-0000-0000-0000-000000000003",
  "10000000-0000-0000-0000-000000000004",
  "10000000-0000-0000-0000-000000000005",
  "10000000-0000-0000-0000-000000000006",
  "10000000-0000-0000-0000-000000000007",
];
const PROD_NAMES = [
  "Sofa L-Shape Minimalis",
  "Kursi Tamu Jepara",
  "Meja Makan Minimalis",
  "Meja Kerja Industrial",
  "Lemari Jati 3 Pintu",
  "Bufet TV Classic",
  "Rak Buku Kayu Pinus",
];
const PROD_PRICES = [8500000, 6200000, 2800000, 1950000, 4500000, 3400000, 1200000];

function wibToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

function dow(dateStr) {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(d);
}

function dayNum(dateStr) {
  return Number(dateStr.slice(8, 10));
}

function doyApprox(dateStr) {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  return Math.floor((d - start) / 86400000);
}

function isoAt(dateStr, txIdx) {
  // date + 8h + 47min * idx as +07:00
  const minutes = 8 * 60 + txIdx * 47;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${dateStr}T${hh}:${mm}:00+07:00`;
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const { data: owners, error: oerr } = await sb
    .from("users")
    .select("id")
    .eq("role", "OWNER")
    .limit(1);
  if (oerr) throw oerr;
  if (!owners?.length) throw new Error("No OWNER");
  const ownerId = owners[0].id;

  // max date
  let maxDate = null;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("transactions")
      .select("created_at")
      .order("created_at", { ascending: false })
      .range(from, from);
    if (error) throw error;
    if (!data?.length) break;
    maxDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date(data[0].created_at));
    break;
  }

  const endDate = wibToday();
  let startDate = maxDate ? addDays(maxDate, 1) : "2026-07-01";
  if (startDate > endDate) {
    console.log("Already up to date:", endDate);
    process.exit(0);
  }

  console.log(`Extending ${startDate} .. ${endDate} owner=${ownerId}`);

  // July transfer if needed
  const monthStart = `${endDate.slice(0, 7)}-01`;
  const transferDay = addDays(monthStart, 2);
  const { count: transferCount } = await sb
    .from("stock_movements")
    .select("*", { count: "exact", head: true })
    .eq("type", "TRANSFER")
    .eq("note", "Transfer bulanan ke toko")
    .gte("created_at", `${transferDay}T00:00:00+07:00`)
    .lte("created_at", `${transferDay}T23:59:59+07:00`);

  if (!transferCount) {
    console.log("Adding monthly transfer for", monthStart);
    for (let i = 0; i < 7; i++) {
      const { data: st } = await sb
        .from("warehouse_stocks")
        .select("qty")
        .eq("warehouse_id", WH_UTAMA)
        .eq("product_id", PROD_IDS[i])
        .maybeSingle();
      if ((st?.qty || 0) >= 80) {
        await sb
          .from("warehouse_stocks")
          .update({ qty: st.qty - 80 })
          .eq("warehouse_id", WH_UTAMA)
          .eq("product_id", PROD_IDS[i]);
      }
      const { data: tok } = await sb
        .from("warehouse_stocks")
        .select("qty")
        .eq("warehouse_id", WH_TOKO)
        .eq("product_id", PROD_IDS[i])
        .maybeSingle();
      if (tok) {
        await sb
          .from("warehouse_stocks")
          .update({ qty: tok.qty + 80 })
          .eq("warehouse_id", WH_TOKO)
          .eq("product_id", PROD_IDS[i]);
      } else {
        await sb.from("warehouse_stocks").insert({
          warehouse_id: WH_TOKO,
          product_id: PROD_IDS[i],
          qty: 80,
        });
      }
      await sb.from("stock_movements").insert({
        type: "TRANSFER",
        product_id: PROD_IDS[i],
        from_warehouse_id: WH_UTAMA,
        to_warehouse_id: WH_TOKO,
        qty: 80,
        note: "Transfer bulanan ke toko",
        reference_type: "SEED",
        created_by: ownerId,
        created_at: `${transferDay}T10:00:00+07:00`,
      });
    }
  }

  // Op costs for month
  const { count: opCount } = await sb
    .from("operational_costs")
    .select("*", { count: "exact", head: true })
    .eq("period_start", monthStart)
    .eq("name", "Gaji Karyawan Bulanan");
  if (!opCount) {
    const yy = Number(monthStart.slice(0, 4));
    const mm = Number(monthStart.slice(5, 7));
    const nextM = mm === 12 ? 1 : mm + 1;
    const nextY = mm === 12 ? yy + 1 : yy;
    const me = addDays(
      `${nextY}-${String(nextM).padStart(2, "0")}-01`,
      -1
    );
    await sb.from("operational_costs").insert([
      {
        name: "Gaji Karyawan Bulanan",
        amount: 5000000 + (yy - 2024) * 250000,
        category: "GAJI",
        period_start: monthStart,
        period_end: me,
        created_by: ownerId,
        created_at: monthStart,
      },
      {
        name: "Listrik & Air",
        amount: 1500000 + (yy - 2024) * 45000,
        category: "LISTRIK",
        period_start: monthStart,
        period_end: me,
        created_by: ownerId,
        created_at: monthStart,
      },
      {
        name: "Sewa Tempat Usaha",
        amount: 1500000,
        category: "SEWA",
        period_start: monthStart,
        period_end: me,
        created_by: ownerId,
        created_at: monthStart,
      },
      {
        name: "Biaya Lain-lain (kebersihan, ATK, dll)",
        amount: 500000,
        category: "LAINNYA",
        period_start: monthStart,
        period_end: me,
        created_by: ownerId,
        created_at: monthStart,
      },
    ]);
    console.log("Op costs inserted for", monthStart);
  }

  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let cur = startDate;
  let days = 0;
  let txs = 0;

  while (cur <= endDate) {
    const d = dayNum(cur);
    const wd = dowMap[dow(cur)];
    const txPerDay =
      wd === 0
        ? 1 + (d % 3)
        : wd === 6
          ? 2 + (d % 3)
          : wd === 5
            ? 2 + (d % 2)
            : 3 + (d % 3);

    const prefix = `TRX-${cur.replace(/-/g, "")}-`;
    const { count: existing } = await sb
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .like("transaction_number", `${prefix}%`);
    if (existing && existing > 0) {
      console.log("skip", cur);
      cur = addDays(cur, 1);
      continue;
    }

    for (let txIdx = 1; txIdx <= txPerDay; txIdx++) {
      const custIdx = (doyApprox(cur) + txIdx * 31) % 10;
      const prodIdx = (d + txIdx * 7) % 7;
      let finalPrice = Math.round(
        PROD_PRICES[prodIdx] * (0.88 + ((d * 3 + txIdx * 7) % 25) / 100)
      );
      let prod2 = -1;
      let line2 = 0;
      if ((d + txIdx) % 7 === 0) {
        prod2 = prodIdx % 7;
        // next product
        prod2 = (prodIdx + 1) % 7;
        line2 = Math.round(PROD_PRICES[prod2] * 0.9);
        finalPrice += line2;
      }
      const isCash = (d * 7 + txIdx * 13) % 10 < 6;
      const isVoid = (d * 11 + txIdx * 17) % 100 < 5;
      let status = isCash ? "LUNAS" : "DP";
      const dpAmount = isCash ? finalPrice : Math.round(finalPrice * 0.5);
      if (isVoid) status = "BATAL";
      const fulfillment = isVoid
        ? "MENUNGGU"
        : ["SELESAI", "SIAP_KIRIM", "PRODUKSI", "MENUNGGU"][(d + txIdx) % 4];
      const createdAt = isoAt(cur, txIdx);
      const trxNum = `${prefix}${pad3(txIdx)}`;

      const { data: tx, error: txErr } = await sb
        .from("transactions")
        .insert({
          transaction_number: trxNum,
          customer_id: CUST_IDS[custIdx],
          customer_name: CUST_NAMES[custIdx],
          product_id: PROD_IDS[prodIdx],
          description: "Seed extend QA",
          final_price: finalPrice,
          payment_type: isCash ? "CASH" : "DP",
          dp_amount: dpAmount,
          status,
          fulfillment_status: fulfillment,
          void_reason: isVoid ? "Customer membatalkan pesanan" : null,
          void_by: isVoid ? ownerId : null,
          void_at: isVoid ? createdAt : null,
          created_by: ownerId,
          created_at: createdAt,
          updated_at: createdAt,
        })
        .select("id")
        .maybeSingle();
      if (txErr) throw txErr;
      const txId = tx.id;
      txs++;

      const line1 = prod2 >= 0 ? finalPrice - line2 : finalPrice;
      await sb.from("transaction_items").insert({
        transaction_id: txId,
        product_id: PROD_IDS[prodIdx],
        product_name: PROD_NAMES[prodIdx],
        quantity: 1,
        unit_price: line1,
        line_total: line1,
        sort_order: 0,
        warehouse_id: WH_TOKO,
      });
      if (prod2 >= 0) {
        await sb.from("transaction_items").insert({
          transaction_id: txId,
          product_id: PROD_IDS[prod2],
          product_name: PROD_NAMES[prod2],
          quantity: 1,
          unit_price: line2,
          line_total: line2,
          sort_order: 1,
          warehouse_id: WH_TOKO,
        });
      }

      if (!isVoid) {
        // stock SALE
        for (const pid of prod2 >= 0 ? [PROD_IDS[prodIdx], PROD_IDS[prod2]] : [PROD_IDS[prodIdx]]) {
          const { data: st } = await sb
            .from("warehouse_stocks")
            .select("qty")
            .eq("warehouse_id", WH_TOKO)
            .eq("product_id", pid)
            .maybeSingle();
          if (st && st.qty >= 1) {
            await sb
              .from("warehouse_stocks")
              .update({ qty: st.qty - 1 })
              .eq("warehouse_id", WH_TOKO)
              .eq("product_id", pid);
          }
          await sb.from("stock_movements").insert({
            type: "SALE",
            product_id: pid,
            from_warehouse_id: WH_TOKO,
            qty: 1,
            note: `Penjualan ${trxNum}`,
            reference_type: "TRANSACTION",
            reference_id: txId,
            created_by: ownerId,
            created_at: createdAt,
          });
        }

        const hppCount = 2 + ((d + txIdx) % 3);
        const hppRows = [];
        for (let h = 1; h <= hppCount; h++) {
          hppRows.push({
            transaction_id: txId,
            name: ["Kayu Jati", "Bahan finishing", "Ongkos tukang"][h % 3],
            amount: Math.round(finalPrice * (0.1 + h * 0.03)),
            created_by: ownerId,
            created_at: createdAt,
          });
        }
        await sb.from("hpp_items").insert(hppRows);

        if (isCash) {
          await sb.from("transaction_payments").insert({
            transaction_id: txId,
            amount: finalPrice,
            method: "TUNAI",
            note: "Pembayaran Lunas",
            created_by: ownerId,
            created_at: createdAt,
            payment_date: createdAt,
          });
        } else {
          await sb.from("transaction_payments").insert({
            transaction_id: txId,
            amount: dpAmount,
            method: "TRANSFER",
            note: "Uang Muka (DP)",
            created_by: ownerId,
            created_at: createdAt,
            payment_date: createdAt,
          });
          if ((d * 7 + txIdx) % 10 < 6) {
            const rem = finalPrice - dpAmount;
            const payAt = isoAt(addDays(cur, 2), txIdx);
            // clamp payAt not after "now" much - ok for seed
            await sb.from("transaction_payments").insert({
              transaction_id: txId,
              amount: rem,
              method: "TUNAI",
              note: "Pelunasan",
              created_by: ownerId,
              created_at: payAt,
              payment_date: payAt,
            });
            await sb.from("transactions").update({ status: "LUNAS" }).eq("id", txId);
          }
        }
      }
      await sleep(30);
    }

    days++;
    console.log("day", cur, "txs", txPerDay);
    cur = addDays(cur, 1);
  }

  console.log(`DONE days=${days} txs=${txs}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
