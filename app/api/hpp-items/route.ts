// ============================================================
// 🔌 API — HPP Items
// ============================================================
// Endpoint untuk create HPP item via fetch.
// ============================================================

import { NextResponse } from "next/server";
import { addHppItem } from "@/lib/transactions";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await addHppItem(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}