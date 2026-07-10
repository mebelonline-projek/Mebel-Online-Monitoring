import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getCustomersList } from "@/lib/customers";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getCustomersList({ q, page, limit });

  return NextResponse.json({ success: true, ...result });
}
