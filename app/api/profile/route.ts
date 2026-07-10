import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getUserProfile } from "@/lib/supabase-server";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { success: false, message: "Profil tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, profile });
}
