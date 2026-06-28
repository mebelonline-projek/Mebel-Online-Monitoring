// ============================================================
// 🔌 API — Void Transaksi (Owner only)
// ============================================================
// Soft-delete: ubah status jadi BATAL.
// ============================================================

import { NextResponse } from "next/server";
import { voidTransaction } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID transaksi wajib diisi" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "Alasan pembatalan minimal 3 karakter" },
        { status: 400 }
      );
    }

    const result = await voidTransaction(id, reason);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
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
