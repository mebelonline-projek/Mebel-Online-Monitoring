/**
 * Slow-safe: set payment_date = created_at (100 rows / batch, sequential updates).
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  let from = 0;
  let updated = 0;
  let checked = 0;

  for (;;) {
    const { data, error } = await sb
      .from("transaction_payments")
      .select("id, payment_date, created_at")
      .order("created_at", { ascending: true })
      .range(from, from + 99);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      checked++;
      if (row.payment_date === row.created_at) continue;
      let ok = false;
      for (let a = 0; a < 5 && !ok; a++) {
        const r = await sb
          .from("transaction_payments")
          .update({ payment_date: row.created_at })
          .eq("id", row.id);
        if (!r.error) {
          ok = true;
          updated++;
        } else {
          await sleep(800 * (a + 1));
        }
      }
      if (!ok) throw new Error("failed update " + row.id);
    }

    console.log("progress", from + data.length, "updated", updated);
    if (data.length < 100) break;
    from += 100;
    await sleep(200);
  }

  console.log("DONE checked", checked, "updated", updated);

  const years = {};
  from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("transaction_payments")
      .select("payment_date, amount")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const p of data) {
      const y = new Date(p.payment_date).toISOString().slice(0, 4);
      years[y] = years[y] || { c: 0, t: 0 };
      years[y].c++;
      years[y].t += Number(p.amount) || 0;
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log("payment_date by year:", years);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
