/**
 * Simulate dashboard KPI per period using payment_date (post-fix).
 * Today assumed from system clock (WIB).
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));

function wibDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

function bounds(period, today) {
  const addDays = (dateStr, days) => {
    const d = new Date(`${dateStr}T12:00:00+07:00`);
    d.setUTCDate(d.getUTCDate() + days);
    return wibDate(d);
  };
  const start = (s) => new Date(`${s}T00:00:00+07:00`).getTime();
  const end = (s) => new Date(`${s}T23:59:59.999+07:00`).getTime();

  if (period === "daily") {
    return { label: today, a: start(today), b: end(today) };
  }
  if (period === "weekly") {
    const d = new Date(`${today}T12:00:00+07:00`);
    const wd = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
    }).format(d);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const monOff = map[wd] === 0 ? -6 : 1 - map[wd];
    const mon = addDays(today, monOff);
    const sun = addDays(mon, 6);
    return { label: `${mon}..${sun}`, a: start(mon), b: end(sun) };
  }
  if (period === "monthly") {
    const [y, m] = today.split("-");
    const ms = `${y}-${m}-01`;
    const next =
      Number(m) === 12
        ? `${Number(y) + 1}-01-01`
        : `${y}-${String(Number(m) + 1).padStart(2, "0")}-01`;
    const me = addDays(next, -1);
    return { label: `${ms}..${me}`, a: start(ms), b: end(me) };
  }
  const y = today.slice(0, 4);
  return { label: y, a: start(`${y}-01-01`), b: end(`${y}-12-31`) };
}

function fmt(n) {
  return Number(n).toLocaleString("id-ID");
}

(async () => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const payments = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("transaction_payments")
      .select("amount, payment_date, transactions!inner(status)")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    payments.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const today = wibDate();
  console.log("Today WIB:", today);
  console.log("Payments:", payments.length);

  const results = {};
  for (const period of ["daily", "weekly", "monthly", "yearly"]) {
    const b = bounds(period, today);
    let revenue = 0;
    let count = 0;
    for (const p of payments) {
      const tx = p.transactions;
      const status = Array.isArray(tx) ? tx[0]?.status : tx?.status;
      if (status === "BATAL") continue;
      const t = new Date(p.payment_date).getTime();
      if (t >= b.a && t <= b.b) {
        revenue += Number(p.amount) || 0;
        count++;
      }
    }
    results[period] = { range: b.label, revenue, payments: count };
    console.log(
      `${period.padEnd(8)} ${b.label.padEnd(24)} Rp ${fmt(revenue)} (${count} payments)`
    );
  }

  const vals = Object.values(results).map((r) => r.revenue);
  const allSame = vals.every((v) => v === vals[0]);
  console.log(allSame ? "FAIL: all periods same revenue" : "PASS: periods differ");

  // Monthly chart bars Jul2025-Jun2026 with revenue > 0
  const months = {};
  for (const p of payments) {
    const tx = p.transactions;
    const status = Array.isArray(tx) ? tx[0]?.status : tx?.status;
    if (status === "BATAL") continue;
    const d = new Date(p.payment_date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (key < "2025-07" || key > "2026-06") continue;
    months[key] = (months[key] || 0) + (Number(p.amount) || 0);
  }
  const bars = Object.keys(months).filter((k) => months[k] > 0).sort();
  console.log("Monthly chart bars with data (Jul25-Jun26):", bars.length, bars);
  console.log(bars.length >= 6 ? "PASS: multi-bar chart expected" : "WARN: few bars");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
