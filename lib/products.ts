"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { productSchema } from "@/lib/validation";
import {
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
} from "@/lib/inventory";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/types/common";

const CACHE_TAG = "products";

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  category_id?: string | null;
  description: string | null;
  base_price: number;
  created_at: string;
}

/** Delegasi ke inventori — wajib category_id + init warehouse_stocks. */
export async function createProduct(
  formData: z.infer<typeof productSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = productSchema.safeParse(formData);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Validasi gagal";
      return {
        success: false,
        message: msg,
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const result = await createInventoryProduct({
      name: parsed.data.name,
      category_id: parsed.data.category_id,
      base_price: parsed.data.base_price,
      min_stock: 0,
      description: parsed.data.description || "",
      warehouse_id: parsed.data.warehouse_id || null,
      initial_qty: parsed.data.initial_qty ?? 0,
    });

    if (result.success) revalidateTag(CACHE_TAG, { expire: 0 });
    return result;
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
      const msg = parsed.error.issues[0]?.message || "Validasi gagal";
      return {
        success: false,
        message: msg,
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("products")
      .select("min_stock")
      .eq("id", id)
      .maybeSingle();

    const result = await updateInventoryProduct(id, {
      name: parsed.data.name,
      category_id: parsed.data.category_id,
      base_price: parsed.data.base_price,
      min_stock: existing?.min_stock ?? 0,
      description: parsed.data.description || "",
    });

    if (result.success) revalidateTag(CACHE_TAG, { expire: 0 });
    return result;
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

    // Sama aturan inventori: blok jika masih ada stok
    const result = await deleteInventoryProduct(id);
    if (result.success) revalidateTag(CACHE_TAG, { expire: 0 });
    return result;
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
    .select("id, name, category, category_id, description, base_price, created_at", {
      count: "exact",
    });

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
      .select("id, name, category, category_id, description, base_price, created_at")
      .order("name", { ascending: true })
      .limit(500);

    if (error) return [];
    return (data || []) as ProductRow[];
  } catch {
    return [];
  }
}
