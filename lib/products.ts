"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { productSchema } from "@/lib/validation";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/types/common";

const CACHE_TAG = "products";

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price: number;
  created_at: string;
}

export async function createProduct(
  formData: z.infer<typeof productSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = productSchema.safeParse(formData);
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
      return { success: false, message: "Hanya Owner yang bisa menambah produk" };
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: parsed.data.name,
        category: parsed.data.category || "LAINNYA",
        description: parsed.data.description || null,
        base_price: parsed.data.base_price,
        created_by: user.id,
      })
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Gagal menambahkan produk" };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, data: { id: data.id }, message: "Produk berhasil ditambahkan" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export async function updateProduct(
  id: string,
  formData: z.infer<typeof productSchema>
): Promise<ActionState> {
  try {
    const parsed = productSchema.safeParse(formData);
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
      return { success: false, message: "Hanya Owner yang bisa mengubah produk" };
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        category: parsed.data.category || "LAINNYA",
        description: parsed.data.description || null,
        base_price: parsed.data.base_price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, message: "Produk berhasil diupdate" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export async function deleteProduct(id: string): Promise<ActionState> {
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
      return { success: false, message: "Hanya Owner yang bisa menghapus produk" };
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidateTag(CACHE_TAG, { expire: 0 });
    return { success: true, message: "Produk berhasil dihapus" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export interface ProductsListResult {
  products: ProductRow[];
  total: number;
  totalPages: number;
}

export async function getProductsList(
  params: { q?: string; page?: number; limit?: number } = {}
): Promise<ProductsListResult> {
  const supabase = await createServerSupabaseClient();
  const { q = "", page = 1, limit = 10 } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select("id, name, category, description, base_price, created_at", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data, count, error } = await query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return { products: [], total: 0, totalPages: 0 };
  }

  return {
    products: (data || []) as ProductRow[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getProductsForPicker(): Promise<ProductRow[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, description, base_price, created_at")
      .order("name", { ascending: true })
      .limit(500);

    if (error) return [];
    return (data || []) as ProductRow[];
  } catch {
    return [];
  }
}
