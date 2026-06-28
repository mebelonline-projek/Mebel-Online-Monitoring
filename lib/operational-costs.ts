"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { operationalCostSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/types/common";

// ============================================================
// Types
// ============================================================
export interface OperationalCostRow {
  id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
}

// ============================================================
// CREATE
// ============================================================
export async function createOperationalCost(
  formData: z.infer<typeof operationalCostSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = operationalCostSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const now = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("operational_costs")
      .insert({
        name: parsed.data.name,
        amount: parsed.data.amount,
        category: parsed.data.category || "LAINNYA",
        period_start: now,
        period_end: now,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { success: false, message: error.message };

    revalidatePath("/operasional");
    return { success: true, data: { id: data.id }, message: "Biaya berhasil ditambahkan" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// UPDATE
// ============================================================
export async function updateOperationalCost(
  id: string,
  formData: z.infer<typeof operationalCostSchema>
): Promise<ActionState> {
  try {
    const parsed = operationalCostSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    // Cek role — hanya OWNER bisa edit
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah biaya operasional" };
    }

    const { error } = await supabase
      .from("operational_costs")
      .update({
        name: parsed.data.name,
        amount: parsed.data.amount,
        category: parsed.data.category || "LAINNYA",
      })
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/operasional");
    return { success: true, message: "Biaya berhasil diupdate" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// DELETE
// ============================================================
export async function deleteOperationalCost(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    // Cek role — hanya OWNER bisa hapus
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus biaya operasional" };
    }

    const { error } = await supabase
      .from("operational_costs")
      .delete()
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/operasional");
    return { success: true, message: "Biaya berhasil dihapus" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// READ — Distinct Categories
// ============================================================
export async function getDistinctCategories(): Promise<string[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("operational_costs")
      .select("category")
      .not("category", "is", null)
      .order("category");

    if (error) return [];

    const categories = [...new Set(data.map((row) => row.category))].filter(Boolean);
    return categories;
  } catch {
    return [];
  }
}
