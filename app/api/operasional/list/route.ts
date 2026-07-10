import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getOperationalCostsList } from "@/lib/operational-costs";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan") || undefined;
  const dari = searchParams.get("dari") || undefined;
  const sampai = searchParams.get("sampai") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getOperationalCostsList({ bulan, dari, sampai, page, limit });

  return NextResponse.json({ success: true, ...result });
}
