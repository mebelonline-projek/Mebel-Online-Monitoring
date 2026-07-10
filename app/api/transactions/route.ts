// ============================================================
// 🔌 API — Transaksi
// ============================================================
// Endpoint untuk create, update & delete transaction via fetch.
// ============================================================

import { NextResponse } from "next/server";
import { createTransaction, updateTransaction, deleteTransactionPermanent } from "@/lib/transactions";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await createTransaction(body);

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

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, ...formData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID transaksi wajib diisi" },
        { status: 400 }
      );
    }

    const result = await updateTransaction(id, formData);

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

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID transaksi wajib diisi" },
        { status: 400 }
      );
    }

    const result = await deleteTransactionPermanent(id);

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