import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getUserProfile } from "@/lib/supabase-server";
import { getPiutangPageData } from "@/lib/piutang";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const profile = await getUserProfile();
  if (!profile || profile.role !== "OWNER") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  const data = await getPiutangPageData();

  return NextResponse.json({ success: true, ...data });
}
