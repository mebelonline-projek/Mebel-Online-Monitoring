// ============================================================
// 🔌 API — HPP Items
// ============================================================
// Endpoint untuk create HPP item via fetch.
// ============================================================

import { NextResponse } from "next/server";
import { addHppItem } from "@/lib/transactions";

export async function POST(request: Request) {
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