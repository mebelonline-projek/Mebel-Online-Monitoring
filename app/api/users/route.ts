import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createUser, updateUser, deleteUser } from "@/lib/users";

/**
 * API JSON untuk kelola user — menghindari bug Server Action
 * "An unexpected response was received from the server" di beberapa kasus (role GUDANG).
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === "create") {
      const result = await createUser({
        email: String(body.email || ""),
        password: String(body.password || ""),
        name: String(body.name || ""),
        role: body.role === "GUDANG" ? "GUDANG" : "KARYAWAN",
      });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) {
        return NextResponse.json(
          { success: false, message: "ID user wajib" },
          { status: 400 }
        );
      }
      const password =
        typeof body.password === "string" && body.password.trim()
          ? body.password.trim()
          : undefined;
      const result = await updateUser(id, {
        name: String(body.name || ""),
        role: body.role === "GUDANG" ? "GUDANG" : "KARYAWAN",
        password,
      });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) {
        return NextResponse.json(
          { success: false, message: "ID user wajib" },
          { status: 400 }
        );
      }
      const result = await deleteUser(id);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json(
      { success: false, message: "action tidak valid (create|update|delete)" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      { status: 500 }
    );
  }
}
