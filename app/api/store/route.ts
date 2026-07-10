import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getStoreSettings } from "@/lib/store-queries";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const settings = await getStoreSettings();

  return NextResponse.json({
    success: true,
    store: {
      store_name: settings?.store_name || "Mebel Online",
      logo_url: settings?.logo_url ?? null,
    },
  });
}
