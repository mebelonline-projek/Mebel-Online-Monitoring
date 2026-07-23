"use client";

import { useEffect, useState } from "react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import {
  fetchPickerData,
  getCachedPickerData,
  type PickerStock,
  type PickerWarehouse,
} from "@/lib/picker-client";
import type { CustomerRow } from "@/lib/customers";
import type { ProductRow } from "@/lib/products";

function KasirFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="h-12 bg-muted rounded-lg" />
      <div className="h-32 bg-muted rounded-lg" />
      <div className="h-10 bg-muted rounded-lg w-1/2" />
      <div className="h-12 bg-muted rounded-lg" />
    </div>
  );
}

export function KasirPageClient() {
  const initialCache = typeof window !== "undefined" ? getCachedPickerData() : null;

  const [customers, setCustomers] = useState<CustomerRow[]>(initialCache?.customers ?? []);
  const [products, setProducts] = useState<ProductRow[]>(initialCache?.products ?? []);
  const [warehouses, setWarehouses] = useState<PickerWarehouse[]>(
    initialCache?.warehouses ?? []
  );
  const [stocks, setStocks] = useState<PickerStock[]>(initialCache?.stocks ?? []);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPickerData()
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers);
        setProducts(data.products);
        setWarehouses(data.warehouses);
        setStocks(data.stocks);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data kasir");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Memuat data kasir...</p>
        <KasirFormSkeleton />
      </div>
    );
  }

  return (
    <TransactionForm
      quickSale
      customers={customers}
      products={products}
      warehouses={warehouses}
      stocks={stocks}
    />
  );
}
