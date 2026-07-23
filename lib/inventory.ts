"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { processProductPhotoBuffer } from "@/lib/process-product-photo";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/common";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/** Admin client — untuk RPC apply_stock_change (hanya service_role). */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[Inventory] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type InventoryRole = "OWNER" | "KARYAWAN" | "GUDANG";

export type WarehouseRow = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  is_sales_warehouse: boolean;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  created_at: string;
};

export type InventoryProductRow = {
  id: string;
  name: string;
  category_id: string | null;
  category: string;
  base_price: number;
  unit: string;
  min_stock: number;
  photo_url: string | null;
  description: string | null;
  created_at: string;
};

export type StockRow = {
  warehouse_id: string;
  product_id: string;
  qty: number;
};

export type MovementRow = {
  id: string;
  type: "IN" | "OUT" | "TRANSFER" | "SALE" | "VOID_RESTORE";
  product_id: string | null;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  qty: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

const warehouseSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  is_sales_warehouse: z.boolean().optional(),
});

const categorySchema = z.object({
  name: z.string().min(2).max(100),
});

const inventoryProductSchema = z.object({
  name: z.string().min(2).max(200),
  category_id: z.string().uuid(),
  base_price: z.coerce.number().min(0).max(999_999_999),
  min_stock: z.coerce.number().int().min(0).max(999_999),
  description: z.string().max(500).optional().or(z.literal("")),
});

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "TRANSFER"]),
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(999_999),
  from_warehouse_id: z.string().uuid().optional().nullable(),
  to_warehouse_id: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional().or(z.literal("")),
});

function revalidateInventory() {
  revalidatePath("/gudang");
  revalidatePath("/gudang/kategori");
  revalidatePath("/gudang/barang");
  revalidatePath("/gudang/stok");
  revalidatePath("/gudang/mutasi");
  revalidatePath("/produk");
  revalidatePath("/kasir");
}

type InventoryWriterAuth =
  | { success: true; data: { userId: string; role: InventoryRole } }
  | { success: false; message: string };

async function requireInventoryWriter(): Promise<InventoryWriterAuth> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Anda harus login" };

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "OWNER" && profile.role !== "GUDANG")) {
    return { success: false, message: "Hanya Owner atau Gudang yang bisa mengubah inventori" };
  }

  return { success: true, data: { userId: user.id, role: profile.role as InventoryRole } };
}

// ---------- READ ----------

export async function getWarehouses(): Promise<WarehouseRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, address, is_active, is_sales_warehouse, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSalesWarehouse(): Promise<WarehouseRow | null> {
  const list = await getWarehouses();
  return list.find((w) => w.is_sales_warehouse && w.is_active) || null;
}

export async function getCategories(): Promise<CategoryRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getInventoryProducts(): Promise<InventoryProductRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category_id, category, base_price, unit, min_stock, photo_url, description, created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return (data || []).map((p) => ({
    ...p,
    unit: p.unit || "pcs",
    min_stock: p.min_stock ?? 0,
  }));
}

export async function getWarehouseStocks(): Promise<StockRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("warehouse_stocks")
    .select("warehouse_id, product_id, qty");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getStockMovements(limit = 50): Promise<MovementRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "id, type, product_id, from_warehouse_id, to_warehouse_id, qty, note, created_at, created_by"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as MovementRow[];
}

export async function getInventoryBundle() {
  const [warehouses, categories, products, stocks, movements] = await Promise.all([
    getWarehouses(),
    getCategories(),
    getInventoryProducts(),
    getWarehouseStocks(),
    getStockMovements(),
  ]);
  return { warehouses, categories, products, stocks, movements };
}

// ---------- WAREHOUSE ----------

export async function createWarehouse(
  input: z.infer<typeof warehouseSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = warehouseSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const makeSales = Boolean(parsed.data.is_sales_warehouse);

    if (makeSales) {
      await supabase
        .from("warehouses")
        .update({ is_sales_warehouse: false })
        .eq("is_sales_warehouse", true);
    }

    const { data, error } = await supabase
      .from("warehouses")
      .insert({
        name: parsed.data.name.trim(),
        address: parsed.data.address?.trim() || null,
        is_active: true,
        is_sales_warehouse: makeSales,
      })
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Gagal menambah gudang" };

    const { data: products } = await supabase.from("products").select("id");
    if (products?.length) {
      await supabase.from("warehouse_stocks").insert(
        products.map((p) => ({ warehouse_id: data.id, product_id: p.id, qty: 0 }))
      );
    }

    revalidateInventory();
    return { success: true, data: { id: data.id }, message: "Gudang ditambahkan" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function updateWarehouse(
  id: string,
  input: z.infer<typeof warehouseSchema>
): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = warehouseSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const isActive = parsed.data.is_active ?? true;
    const makeSales = Boolean(parsed.data.is_sales_warehouse);

    if (!isActive && makeSales) {
      return { success: false, message: "Gudang penjualan harus tetap aktif. Tandai gudang lain dulu." };
    }

    if (makeSales) {
      await supabase
        .from("warehouses")
        .update({ is_sales_warehouse: false })
        .neq("id", id);
    }

    const { error } = await supabase
      .from("warehouses")
      .update({
        name: parsed.data.name.trim(),
        address: parsed.data.address?.trim() || null,
        is_active: isActive,
        is_sales_warehouse: makeSales,
      })
      .eq("id", id);

    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Gudang diperbarui" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function deleteWarehouse(id: string): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;

    const supabase = await createServerSupabaseClient();
    const { data: wh } = await supabase
      .from("warehouses")
      .select("is_sales_warehouse")
      .eq("id", id)
      .maybeSingle();

    if (!wh) return { success: false, message: "Gudang tidak ditemukan" };
    if (wh.is_sales_warehouse) {
      return { success: false, message: "Tidak bisa hapus gudang penjualan. Tandai gudang lain dulu." };
    }

    const { data: stocks } = await supabase
      .from("warehouse_stocks")
      .select("qty")
      .eq("warehouse_id", id);

    if (stocks?.some((s) => s.qty > 0)) {
      return { success: false, message: "Gudang masih punya stok. Kosongkan dulu lewat mutasi." };
    }

    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Gudang dihapus" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

// ---------- CATEGORY ----------

export async function createCategory(input: z.infer<typeof categorySchema>): Promise<ActionState<{ id: string }>> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("product_categories")
      .insert({ name: parsed.data.name.trim() })
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Gagal menambah kategori" };
    revalidateInventory();
    return { success: true, data: { id: data.id }, message: "Kategori ditambahkan" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function updateCategory(id: string, input: z.infer<typeof categorySchema>): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const name = parsed.data.name.trim();
    const { error } = await supabase.from("product_categories").update({ name }).eq("id", id);
    if (error) return { success: false, message: error.message };

    await supabase.from("products").update({ category: name }).eq("category_id", id);
    revalidateInventory();
    return { success: true, message: "Kategori diperbarui" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function deleteCategory(id: string): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;

    const supabase = await createServerSupabaseClient();
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if ((count || 0) > 0) {
      return { success: false, message: "Kategori masih dipakai barang. Pindahkan barang dulu." };
    }

    const { error } = await supabase.from("product_categories").delete().eq("id", id);
    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Kategori dihapus" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

// ---------- PRODUCT + PHOTO ----------

export async function createInventoryProduct(
  input: z.infer<typeof inventoryProductSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = inventoryProductSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const { data: cat } = await supabase
      .from("product_categories")
      .select("name")
      .eq("id", parsed.data.category_id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: parsed.data.name.trim(),
        category_id: parsed.data.category_id,
        category: cat?.name || "LAINNYA",
        base_price: parsed.data.base_price,
        unit: "pcs",
        min_stock: parsed.data.min_stock,
        description: parsed.data.description?.trim() || null,
        created_by: auth.data.userId,
      })
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Gagal menambah barang" };

    const { data: whs } = await supabase.from("warehouses").select("id").eq("is_active", true);
    if (whs?.length) {
      await supabase.from("warehouse_stocks").insert(
        whs.map((w) => ({ warehouse_id: w.id, product_id: data.id, qty: 0 }))
      );
    }

    revalidateInventory();
    return { success: true, data: { id: data.id }, message: "Barang ditambahkan" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function updateInventoryProduct(
  id: string,
  input: z.infer<typeof inventoryProductSchema>
): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = inventoryProductSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const supabase = await createServerSupabaseClient();
    const { data: cat } = await supabase
      .from("product_categories")
      .select("name")
      .eq("id", parsed.data.category_id)
      .maybeSingle();

    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name.trim(),
        category_id: parsed.data.category_id,
        category: cat?.name || "LAINNYA",
        base_price: parsed.data.base_price,
        min_stock: parsed.data.min_stock,
        description: parsed.data.description?.trim() || null,
      })
      .eq("id", id);

    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Barang diperbarui" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function uploadProductPhoto(productId: string, formData: FormData): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;

    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, message: "File tidak ditemukan" };
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { success: false, message: "Format harus JPEG, PNG, atau WebP" };
    }

    const supabase = await createServerSupabaseClient();
    const { data: product } = await supabase
      .from("products")
      .select("photo_url")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { success: false, message: "Barang tidak ditemukan" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const webp = await processProductPhotoBuffer(buffer);
    const path = `${productId}.webp`;

    if (product.photo_url?.includes("/product-photos/")) {
      const oldPath = product.photo_url.split("/product-photos/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("product-photos").remove([oldPath]);
    }

    const { error: upErr } = await supabase.storage.from("product-photos").upload(path, webp, {
      contentType: "image/webp",
      upsert: true,
    });
    if (upErr) return { success: false, message: upErr.message };

    const { data: pub } = supabase.storage.from("product-photos").getPublicUrl(path);
    const { error } = await supabase
      .from("products")
      .update({ photo_url: pub.publicUrl })
      .eq("id", productId);

    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Foto diunggah" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

export async function deleteInventoryProduct(id: string): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;

    const supabase = await createServerSupabaseClient();
    const { data: stocks } = await supabase
      .from("warehouse_stocks")
      .select("qty")
      .eq("product_id", id);

    if (stocks?.some((s) => s.qty > 0)) {
      return { success: false, message: "Masih ada stok. Mutasi OUT sampai 0 dulu sebelum hapus." };
    }

    const { data: product } = await supabase
      .from("products")
      .select("photo_url")
      .eq("id", id)
      .maybeSingle();

    if (product?.photo_url?.includes("/product-photos/")) {
      const oldPath = product.photo_url.split("/product-photos/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("product-photos").remove([oldPath]);
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: "Barang & foto dihapus permanen" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

// ---------- MOVEMENT ----------

export async function createStockMovement(
  input: z.infer<typeof movementSchema>
): Promise<ActionState> {
  try {
    const auth = await requireInventoryWriter();
    if (!auth.success) return auth;
    const parsed = movementSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validasi gagal" };

    const d = parsed.data;
    const fromId = d.from_warehouse_id || null;
    const toId = d.to_warehouse_id || null;

    if (d.type === "IN" && !toId) return { success: false, message: "Pilih gudang tujuan" };
    if (d.type === "OUT" && !fromId) return { success: false, message: "Pilih gudang asal" };
    if (d.type === "TRANSFER") {
      if (!fromId || !toId) return { success: false, message: "Pilih gudang asal dan tujuan" };
      if (fromId === toId) return { success: false, message: "Gudang asal dan tujuan harus berbeda" };
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("apply_stock_change", {
      p_type: d.type,
      p_product_id: d.product_id,
      p_qty: d.qty,
      p_from_warehouse_id: d.type === "IN" ? null : fromId,
      p_to_warehouse_id: d.type === "OUT" ? null : toId,
      p_note: d.note?.trim() || null,
      p_reference_type: null,
      p_reference_id: null,
      p_created_by: auth.data.userId,
    });

    if (error) return { success: false, message: error.message };
    revalidateInventory();
    return { success: true, message: `Mutasi ${d.type} berhasil` };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" };
  }
}

/** Dipakai transaksi: potong stok SALE. */
export async function applySaleStock(params: {
  productId: string;
  warehouseId: string;
  qty: number;
  transactionId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("apply_stock_change", {
    p_type: "SALE",
    p_product_id: params.productId,
    p_qty: params.qty,
    p_from_warehouse_id: params.warehouseId,
    p_to_warehouse_id: null,
    p_note: "Penjualan kasir",
    p_reference_type: "transaction",
    p_reference_id: params.transactionId,
    p_created_by: params.userId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Dipakai void: restore stok dari movement SALE transaksi. */
export async function restoreSaleStock(transactionId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: sales } = await admin
    .from("stock_movements")
    .select("product_id, from_warehouse_id, qty")
    .eq("reference_type", "transaction")
    .eq("reference_id", transactionId)
    .eq("type", "SALE");

  if (!sales?.length) return;

  for (const m of sales) {
    if (!m.product_id || !m.from_warehouse_id) continue;
    await admin.rpc("apply_stock_change", {
      p_type: "VOID_RESTORE",
      p_product_id: m.product_id,
      p_qty: m.qty,
      p_from_warehouse_id: null,
      p_to_warehouse_id: m.from_warehouse_id,
      p_note: "Restore void transaksi",
      p_reference_type: "transaction",
      p_reference_id: transactionId,
      p_created_by: userId,
    });
  }
}
