// ============================================================
// 🗃️ Run Database Migration
// ============================================================
// Jalankan: node scripts/run-migration.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Load .env.local
const envPath = join(projectRoot, ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sqlPath = join(projectRoot, "supabase", "migrate_remove_products_customers.sql");
const sql = readFileSync(sqlPath, "utf-8");

console.log("🚀 Running migration: migrate_remove_products_customers.sql");
console.log("────────────────────────────────────────────────────────");

const { data, error } = await supabase.rpc("exec_sql", { sql_text: sql });

if (error) {
  // If exec_sql doesn't exist, try raw query
  console.log("⚠️  exec_sql RPC not found, trying direct query...");
  
  // Split SQL into individual statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    const { error: stmtError } = await supabase.rpc("exec_sql", { sql_text: stmt + ";" });
    if (stmtError) {
      console.error(`❌ Error executing: ${stmt.substring(0, 80)}...`);
      console.error(`   ${stmtError.message}`);
    } else {
      console.log(`✅ ${stmt.substring(0, 80)}...`);
    }
  }
} else {
  console.log("✅ Migration completed successfully!");
}

console.log("────────────────────────────────────────────────────────");
console.log("🎉 Done!");