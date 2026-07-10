import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getCustomersForPicker } from "@/lib/customers";
import { getProductsForPicker } from "@/lib/products";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const [customers, products] = await Promise.all([
    getCustomersForPicker(),
    getProductsForPicker(),
  ]);

  return NextResponse.json({
    success: true,
    customers,
    products,
  });
}
