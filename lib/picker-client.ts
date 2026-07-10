"use client";

import type { CustomerRow } from "@/lib/customers";
import type { ProductRow } from "@/lib/products";

const CACHE_KEY = "pos-picker-v1";
const TTL_MS = 3 * 60 * 1000;

interface PickerCache {
  ts: number;
  customers: CustomerRow[];
  products: ProductRow[];
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
export function getCachedPickerData(): {
  customers: CustomerRow[];
  products: ProductRow[];
} | null {
  const cached = readPickerCache();
  if (!cached) return null;
  return { customers: cached.customers, products: cached.products };
}

export async function fetchPickerData(): Promise<{
  customers: CustomerRow[];
  products: ProductRow[];
}> {
  const cached = getCachedPickerData();
  if (cached) return cached;

  const res = await fetch("/api/picker");
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memuat data kasir");
  }

  const data = {
    customers: json.customers as CustomerRow[],
    products: json.products as ProductRow[],
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
  } catch {
    // ignore
  }
}
