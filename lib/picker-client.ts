"use client";

import type { CustomerRow } from "@/lib/customers";
import type { ProductRow } from "@/lib/products";

const CACHE_KEY = "pos-picker-v2";
const TTL_MS = 3 * 60 * 1000;

export type PickerWarehouse = {
  id: string;
  name: string;
  is_active: boolean;
  is_sales_warehouse: boolean;
};

export type PickerStock = {
  warehouse_id: string;
  product_id: string;
  qty: number;
};

export type PickerData = {
  customers: CustomerRow[];
  products: ProductRow[];
  warehouses: PickerWarehouse[];
  stocks: PickerStock[];
};

interface PickerCache extends PickerData {
  ts: number;
}

function readPickerCache(): PickerCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as PickerCache;
    if (Date.now() - cached.ts < TTL_MS) return cached;
  } catch {
    // ignore corrupt cache
  }
  return null;
}

/** Baca cache picker secara sinkron — untuk render instan setelah NavWarmup. */
export function getCachedPickerData(): PickerData | null {
  const cached = readPickerCache();
  if (!cached) return null;
  return {
    customers: cached.customers,
    products: cached.products,
    warehouses: cached.warehouses ?? [],
    stocks: cached.stocks ?? [],
  };
}

export async function fetchPickerData(): Promise<PickerData> {
  const cached = getCachedPickerData();
  if (cached) return cached;

  const res = await fetch("/api/picker");
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memuat data kasir");
  }

  const data: PickerData = {
    customers: json.customers as CustomerRow[],
    products: json.products as ProductRow[],
    warehouses: (json.warehouses as PickerWarehouse[]) ?? [],
    stocks: (json.stocks as PickerStock[]) ?? [],
  };

  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), ...data } satisfies PickerCache)
    );
  } catch {
    // ignore quota errors
  }

  return data;
}

export function invalidatePickerCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem("pos-picker-v1");
  } catch {
    // ignore
  }
}

export function getStockQty(
  stocks: PickerStock[],
  productId: string,
  warehouseId: string
): number {
  return stocks.find((s) => s.product_id === productId && s.warehouse_id === warehouseId)?.qty ?? 0;
}
