import { NextResponse } from "next/server";
import { isDevAdminRouteAllowed } from "@/lib/dev-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDevAdminRouteAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: "disabled",
    message: "Endpoint debug dinonaktifkan. Jalankan migrasi lewat Supabase SQL Editor.",
  });
}
