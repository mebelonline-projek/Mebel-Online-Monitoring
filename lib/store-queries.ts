// ============================================================
// 🏪 STORE QUERIES — Query data toko (bukan Server Actions)
// ============================================================
// Dipanggil dari Server Components untuk membaca data store_settings.
// ============================================================

import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface StoreSettings {
  id: string;
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  updated_at: string | null;
}

export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("store_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    return data ?? null;
  } catch {
    return null;
  }
});
