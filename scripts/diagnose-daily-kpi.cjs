/**
 * Diagnose why daily/weekly KPI might be 0 while monthly works.
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

function wibDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return wibDate(d);
}

(async () => {
  const today = wibDate();
  console.log("today WIB", today, "server now", new Date().toISOString());

  // July payments by WIB day
  const { data: pays, error } = await sb
    .from("transaction_payments")
    .select("amount, payment_date, created_at, transactions!inner(status)")
    .gte("payment_date", "2026-07-01T00:00:00+07:00")
    .lte("payment_date", "2026-07-31T23:59:59.999+07:00")
    .order("payment_date", { ascending: true })
    .limit(2000);
  if (error) throw error;

  const byDay = {};
  for (const p of pays || []) {
    const status = Array.isArray(p.transactions)
      ? p.transactions[0]?.status
      : p.transactions?.status;
    if (status === "BATAL") continue;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date(p.payment_date));
    byDay[day] = byDay[day] || { n: 0, sum: 0, samples: [] };
    byDay[day].n++;
    byDay[day].sum += Number(p.amount) || 0;
    if (byDay[day].samples.length < 2) {
      byDay[day].samples.push(p.payment_date);
    }
  }
  console.log("July payments by WIB day:");
  for (const d of Object.keys(byDay).sort()) {
    console.log(
      d,
      "n=",
      byDay[d].n,
      "sum=",
      byDay[d].sum,
      "sample=",
      byDay[d].samples
    );
  }

  // Exact dashboard bounds
  const kpiDailyStart = new Date(`${today}T00:00:00+07:00`).getTime();
  const kpiDailyEnd = new Date(`${today}T23:59:59.999+07:00`).getTime();

  // weekly monday
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(new Date(`${today}T12:00:00+07:00`));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const monOff = map[wd] === 0 ? -6 : 1 - map[wd];
  const monday = addDays(today, monOff);
  const sunday = addDays(monday, 6);
  const kpiWeekStart = new Date(`${monday}T00:00:00+07:00`).getTime();
  const kpiWeekEnd = new Date(`${sunday}T23:59:59.999+07:00`).getTime();

  console.log("\nDaily bounds", today, new Date(kpiDailyStart).toISOString(), "->", new Date(kpiDailyEnd).toISOString());
  console.log("Weekly bounds", monday, "..", sunday);

  let daily = 0,
    weekly = 0,
    monthly = 0;
  for (const p of pays || []) {
    const status = Array.isArray(p.transactions)
      ? p.transactions[0]?.status
      : p.transactions?.status;
    if (status === "BATAL") continue;
    const t = new Date(p.payment_date).getTime();
    const amt = Number(p.amount) || 0;
    if (t >= kpiDailyStart && t <= kpiDailyEnd) daily += amt;
    if (t >= kpiWeekStart && t <= kpiWeekEnd) weekly += amt;
    monthly += amt;
  }
  console.log("\nAggregates from July fetch:");
  console.log("daily", daily);
  console.log("weekly", weekly);
  console.log("monthly(all July in fetch)", monthly);

  // Also check txs created today
  const { data: txs } = await sb
    .from("transactions")
    .select("transaction_number, created_at, status, final_price")
    .like("transaction_number", `TRX-${today.replace(/-/g, "")}-%`);
  console.log("\nTxs today prefix:", (txs || []).length, txs?.slice(0, 3));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
