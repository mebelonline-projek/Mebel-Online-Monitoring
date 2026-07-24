// ============================================================
// 🔌 API — HPP Items by ID (update & delete)
// ============================================================

import { NextResponse } from "next/server";
import { deleteHppItem, updateHppItem } from "@/lib/transactions";
import { requireApiAuth } from "@/lib/api-auth";
import { getUserProfile } from "@/lib/supabase-server";

async function requireOwner() {
  const auth = await requireApiAuth();
  if (auth.error) return auth;

  const profile = await getUserProfile();
  if (!profile || profile.role !== "OWNER") {
    return {
      user: null as null,
      error: NextResponse.json(
        { success: false, message: "Hanya Owner yang dapat mengelola HPP" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateHppItem(id, body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await deleteHppItem(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
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
