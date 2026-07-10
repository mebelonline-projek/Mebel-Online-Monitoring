import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-queries";

/** Info toko publik — untuk halaman login (tanpa auth) */
export async function GET() {
  const settings = await getStoreSettings();

  return NextResponse.json({
    success: true,
    store: {
      store_name: settings?.store_name || "Mebel Online",
      logo_url: settings?.logo_url ?? null,
    },
  });
}
