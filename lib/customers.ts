"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { customerSchema } from "@/lib/validation";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/types/common";

const CACHE_TAG = "customers";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
}

export async function createCustomer(
  formData: z.infer<typeof customerSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = customerSchema.safeParse(formData);
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
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null,
        created_by: user.id,
      })
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Gagal menambahkan pelanggan" };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, data: { id: data.id }, message: "Pelanggan berhasil ditambahkan" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export async function updateCustomer(
  id: string,
  formData: z.infer<typeof customerSchema>
): Promise<ActionState> {
  try {
    const parsed = customerSchema.safeParse(formData);
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
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah pelanggan" };
    }

    const { error } = await supabase
      .from("customers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, message: "Pelanggan berhasil diupdate" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export async function deleteCustomer(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus pelanggan" };
    }

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, message: "Pelanggan berhasil dihapus" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export interface CustomersListResult {
  customers: CustomerRow[];
  total: number;
  totalPages: number;
}

export async function getCustomersList(
  params: { q?: string; page?: number; limit?: number } = {}
): Promise<CustomersListResult> {
  const supabase = await createServerSupabaseClient();
  const { q = "", page = 1, limit = 10 } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select("id, name, phone, address, note, created_at", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, count, error } = await query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return { customers: [], total: 0, totalPages: 0 };
  }

  return {
    customers: (data || []) as CustomerRow[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getCustomersForPicker(): Promise<CustomerRow[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, address, note, created_at")
      .order("name", { ascending: true })
      .limit(500);

    if (error) return [];
    return (data || []) as CustomerRow[];
  } catch {
    return [];
  }
}
