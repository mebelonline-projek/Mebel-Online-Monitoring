import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getWibDayBounds } from "@/lib/date-utils";

export interface KaryawanDashboardData {
  transactions: Array<{
    id: string;
    transaction_number: string;
    customer_name: string | null;
    final_price: number;
    status: string;
    fulfillment_status: string | null;
    created_at: string;
  }>;
  activeOrders: Array<{
    id: string;
    transaction_number: string;
    customer_name: string | null;
    fulfillment_status: string | null;
    status: string;
  }>;
  todayCount: number;
  pendingCount: number;
  completedCount: number;
}

export const getKaryawanDashboardData = unstable_cache(
  async (): Promise<KaryawanDashboardData> => {
    const supabase = await createServerSupabaseClient();
    const { start: todayStart, end: todayEnd } = getWibDayBounds();

    const [
      { data: transactions },
      { data: activeOrders },
      { count: todayCount },
      { count: pendingCount },
      { count: completedCount },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, transaction_number, customer_name, final_price, status, fulfillment_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("transactions")
        .select("id, transaction_number, customer_name, fulfillment_status, status")
        .neq("status", "BATAL")
        .in("fulfillment_status", ["MENUNGGU", "PRODUKSI", "SIAP_KIRIM"])
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .neq("status", "BATAL")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .in("status", ["DP", "MENUNGGU_PELUNASAN"]),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "LUNAS")
        .gte("updated_at", todayStart)
        .lte("updated_at", todayEnd),
    ]);

    return {
      transactions: transactions || [],
      activeOrders: activeOrders || [],
      todayCount: todayCount || 0,
      pendingCount: pendingCount || 0,
      completedCount: completedCount || 0,
    };
  },
  ["karyawan-dashboard"],
  { revalidate: 30, tags: ["transactions", "dashboard"] }
);
