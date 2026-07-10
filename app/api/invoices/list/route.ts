import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getInvoicesList } from "@/lib/transactions";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "semua";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getInvoicesList({ q, status, page, limit });

  return NextResponse.json(result);
}
