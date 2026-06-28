import { NextResponse } from "next/server";
import { isDevAdminRouteAllowed } from "@/lib/dev-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDevAdminRouteAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: false,
    message: "Endpoint migrate dinonaktifkan. Jalankan SQL di Supabase Dashboard.",
  });
}
