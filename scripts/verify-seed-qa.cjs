/**
 * One-off QA: verify seed counts vs dashboard-style aggregates.
 * Loads .env.local — does not print secrets.
 */
const fs = require("fs");
const path = require("path");

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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.includes("your_")) {
  console.error("FAIL: SUPABASE env missing in .env.local");
  process.exit(1);
}

async function rpc(sql) {
  // Use PostgREST isn't enough for arbitrary SQL — use supabase REST rpc won't work
  // Use fetch to pg via supabase management? No.
  // Use @supabase/supabase-js from node_modules
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fmt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("id-ID");
}

(async () => {
  const supabase = await rpc();

  const report = { ok: [], warn: [], fail: [] };

  // F-style counts
  const tables = {
    transactions: await supabase.from("transactions").select("*", { count: "exact", head: true }),
    customers: await supabase.from("customers").select("*", { count: "exact", head: true }),
    products: await supabase.from("products").select("*", { count: "exact", head: true }),
    hpp_items: await supabase.from("hpp_items").select("*", { count: "exact", head: true }),
    payments: await supabase.from("transaction_payments").select("*", { count: "exact", head: true }),
    op: await supabase.from("operational_costs").select("*", { count: "exact", head: true }),
    invoices: await supabase.from("invoices").select("*", { count: "exact", head: true }),
    warehouses: await supabase.from("warehouses").select("*", { count: "exact", head: true }),
    movements: await supabase.from("stock_movements").select("*", { count: "exact", head: true }),
    categories: await supabase.from("product_categories").select("*", { count: "exact", head: true }),
  };

  for (const [k, res] of Object.entries(tables)) {
    if (res.error) {
      report.fail.push(`${k}: ${res.error.message}`);
    }
  }

  const txAll = tables.transactions.count ?? 0;
  const cust = tables.customers.count ?? 0;
  const prod = tables.products.count ?? 0;
  const hpp = tables.hpp_items.count ?? 0;
  const pay = tables.payments.count ?? 0;
  const op = tables.op.count ?? 0;
  const inv = tables.invoices.count ?? 0;
  const wh = tables.warehouses.count ?? 0;
  const mov = tables.movements.count ?? 0;
  const cat = tables.categories.count ?? 0;

  // Fetch all transactions (paginate) for aggregates — 3k rows ok
  let txs = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, status, final_price, created_at, payment_type")
      .range(from, from + page - 1);
    if (error) {
      report.fail.push(`tx fetch: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    txs = txs.concat(data);
    if (data.length < page) break;
    from += page;
  }

  const aktif = txs.filter((t) => t.status !== "BATAL");
  const byStatus = {};
  for (const t of txs) {
    byStatus[t.status] = byStatus[t.status] || { count: 0, revenue: 0 };
    byStatus[t.status].count++;
    byStatus[t.status].revenue += Number(t.final_price) || 0;
  }

  const revenueAktif = aktif.reduce((s, t) => s + (Number(t.final_price) || 0), 0);

  // HPP for non-batal
  const aktifIds = new Set(aktif.map((t) => t.id));
  let hppRows = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("hpp_items")
      .select("transaction_id, amount")
      .range(from, from + page - 1);
    if (error) {
      report.fail.push(`hpp fetch: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    hppRows = hppRows.concat(data);
    if (data.length < page) break;
    from += page;
  }
  const totalHpp = hppRows
    .filter((h) => aktifIds.has(h.transaction_id))
    .reduce((s, h) => s + (Number(h.amount) || 0), 0);

  // Op costs by category
  const { data: ops, error: opErr } = await supabase
    .from("operational_costs")
    .select("category, amount");
  if (opErr) report.fail.push(`op: ${opErr.message}`);
  const opByCat = {};
  let opTotal = 0;
  for (const o of ops || []) {
    opByCat[o.category] = (opByCat[o.category] || 0) + Number(o.amount);
    opTotal += Number(o.amount);
  }

  // Year summary
  const byYear = {};
  for (const t of aktif) {
    const y = new Date(t.created_at).getUTCFullYear();
    byYear[y] = byYear[y] || { count: 0, revenue: 0 };
    byYear[y].count++;
    byYear[y].revenue += Number(t.final_price) || 0;
  }

  // Month Jul 2025 - Jun 2026
  const byMonth = {};
  for (const t of txs) {
    const d = new Date(t.created_at);
    if (d < new Date("2025-07-01") || d >= new Date("2026-07-01")) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = byMonth[key] || { count: 0, revenue: 0, batal: 0 };
    if (t.status === "BATAL") byMonth[key].batal++;
    else {
      byMonth[key].count++;
      byMonth[key].revenue += Number(t.final_price) || 0;
    }
  }

  // Warehouse sales
  const { data: whRows } = await supabase
    .from("warehouses")
    .select("name, is_sales_warehouse, is_active");
  const salesWh = (whRows || []).filter((w) => w.is_sales_warehouse);

  // Stocks sample
  const { data: stocks } = await supabase
    .from("warehouse_stocks")
    .select("warehouse_id, product_id, qty");
  const stockNeg = (stocks || []).filter((s) => s.qty < 0);
  const stockZeroToko = (stocks || []).filter((s) => s.qty === 0);

  // Expectations checks
  if (cust === 10) report.ok.push("customers = 10");
  else report.fail.push(`customers expected 10 got ${cust}`);

  if (prod === 7) report.ok.push("products = 7");
  else report.fail.push(`products expected 7 got ${prod}`);

  if (cat === 4) report.ok.push("categories = 4");
  else report.warn.push(`categories expected 4 got ${cat}`);

  if (wh === 2) report.ok.push("warehouses = 2");
  else report.fail.push(`warehouses expected 2 got ${wh}`);

  if (salesWh.length === 1) report.ok.push("exactly 1 sales warehouse");
  else report.fail.push(`sales warehouse count = ${salesWh.length}`);

  if (txAll >= 2500 && txAll <= 3500) report.ok.push(`tx_total ${txAll} in range`);
  else report.warn.push(`tx_total ${txAll} outside ~2500-3500`);

  const voidPct = txAll ? ((txAll - aktif.length) / txAll) * 100 : 0;
  if (voidPct >= 3 && voidPct <= 7) report.ok.push(`void ~${voidPct.toFixed(1)}%`);
  else report.warn.push(`void ${voidPct.toFixed(1)}% (target ~5%)`);

  if (inv >= 1) report.ok.push(`invoices = ${inv}`);
  else report.warn.push("no invoices");

  if (stockNeg.length === 0) report.ok.push("no negative stock");
  else report.fail.push(`${stockNeg.length} negative stock rows`);

  if (op === 130) report.ok.push("op_costs = 130");
  else report.warn.push(`op_costs ${op} (seed expected ~130)`);

  // Consistency vs user-reported F
  const userF = { tx: 3064, aktif: 2930, cust: 10, prod: 7, hpp: 8802, pay: 2930, op: 130 };
  if (txAll === userF.tx && aktif.length === userF.aktif) {
    report.ok.push("matches your F query counts");
  } else {
    report.warn.push(
      `live counts tx=${txAll}/${aktif.length} vs your F ${userF.tx}/${userF.aktif} (re-seed or different DB?)`
    );
  }

  const gross = revenueAktif - totalHpp;
  const net = gross - opTotal;

  console.log("=== VERIFIKASI SEED (live Supabase) ===\n");
  console.log("--- Counts ---");
  console.log(
    JSON.stringify(
      {
        tx_total: txAll,
        tx_aktif: aktif.length,
        customers: cust,
        products: prod,
        categories: cat,
        warehouses: wh,
        invoices: inv,
        hpp_items: hpp,
        payments: pay,
        op_costs: op,
        movements: mov,
        stock_rows: (stocks || []).length,
      },
      null,
      2
    )
  );

  console.log("\n--- A. Status ---");
  for (const [st, v] of Object.entries(byStatus).sort()) {
    console.log(`${st}: count=${v.count} revenue=Rp ${fmt(v.revenue)}`);
  }

  console.log("\n--- Totals (non-BATAL) ---");
  console.log(`Revenue: Rp ${fmt(revenueAktif)}`);
  console.log(`HPP:     Rp ${fmt(totalHpp)}`);
  console.log(`Gross:   Rp ${fmt(gross)}`);
  console.log(`OpCost:  Rp ${fmt(opTotal)}`);
  console.log(`Net*:    Rp ${fmt(net)}  (*gross - all-time op costs)`);

  console.log("\n--- C. Op by category ---");
  for (const [c, a] of Object.entries(opByCat).sort()) {
    console.log(`${c}: Rp ${fmt(a)}`);
  }

  console.log("\n--- E. Per tahun (aktif) ---");
  for (const y of Object.keys(byYear).sort()) {
    console.log(`${y}: tx=${byYear[y].count} revenue=Rp ${fmt(byYear[y].revenue)}`);
  }

  console.log("\n--- D. Per bulan Jul25-Jun26 (aktif) ---");
  for (const m of Object.keys(byMonth).sort()) {
    const v = byMonth[m];
    console.log(`${m}: tx=${v.count} revenue=Rp ${fmt(v.revenue)}`);
  }

  console.log("\n--- Checklist ---");
  for (const x of report.ok) console.log(`OK   ${x}`);
  for (const x of report.warn) console.log(`WARN ${x}`);
  for (const x of report.fail) console.log(`FAIL ${x}`);

  console.log(
    `\nRESULT: ${report.fail.length === 0 ? "PASS" : "FAIL"} (${report.ok.length} ok, ${report.warn.length} warn, ${report.fail.length} fail)`
  );
  process.exit(report.fail.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
