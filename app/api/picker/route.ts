import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getCustomersForPicker } from "@/lib/customers";
import { getProductsForPicker } from "@/lib/products";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const [customers, products] = await Promise.all([
    getCustomersForPicker(),
    getProductsForPicker(),
  ]);

  let warehouses: Array<{
    id: string;
    name: string;
    is_active: boolean;
    is_sales_warehouse: boolean;
  }> = [];
  let stocks: Array<{ warehouse_id: string; product_id: string; qty: number }> = [];

  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: whs }, { data: st }] = await Promise.all([
      supabase
        .from("warehouses")
        .select("id, name, is_active, is_sales_warehouse")
        .eq("is_active", true)
        .order("name"),
      supabase.from("warehouse_stocks").select("warehouse_id, product_id, qty"),
    ]);
    warehouses = whs || [];
    stocks = st || [];
  } catch {
    // Inventori belum dimigrasi — kasir tetap jalan tanpa stok
  }

  return NextResponse.json({
    success: true,
    customers,
    products,
    warehouses,
    stocks,
  });
}
