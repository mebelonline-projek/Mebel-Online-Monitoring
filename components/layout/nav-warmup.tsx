"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchPickerData } from "@/lib/picker-client";

const BASE_WARM_ROUTES = ["/kasir", "/transaksi", "/customer", "/produk"] as const;
const isDev = process.env.NODE_ENV === "development";

export function NavWarmup({ role }: { role: string }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const warmup = () => {
      fetchPickerData().catch(() => {
        // Abaikan — akan di-fetch ulang saat buka kasir
      });

      if (isDev) return;

      fetch("/api/customers/list?page=1").catch(() => {});
      fetch("/api/products/list?page=1").catch(() => {});
      fetch("/api/transactions/list?page=1&status=semua&fulfillment=semua").catch(() => {});
      fetch("/api/invoices/list?page=1&status=semua").catch(() => {});
      fetch("/api/operasional/list?page=1").catch(() => {});
      if (role === "OWNER") fetch("/api/piutang").catch(() => {});

      const routes = [
        ...BASE_WARM_ROUTES,
        role === "OWNER" ? "/dashboard/owner" : "/dashboard/karyawan",
        ...(role === "OWNER" ? ["/piutang", "/invoice", "/operasional"] : []),
      ];

      routes.forEach((href, index) => {
        window.setTimeout(() => router.prefetch(href), index * 250);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warmup, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(warmup, 1500);
    return () => window.clearTimeout(timer);
  }, [router, role]);

  return null;
}
