import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";

export async function requireApiAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null as null,
      error: NextResponse.json(
        { success: false, message: "Anda harus login" },
        { status: 401 }
      ),
    };
  }
  return { user, error: null as null };
}
