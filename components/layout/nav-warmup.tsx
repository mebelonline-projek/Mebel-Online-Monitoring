"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchPickerData } from "@/lib/picker-client";

const isDev = process.env.NODE_ENV === "development";

export function NavWarmup({ role }: { role: string }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const warmup = () => {
      if (isDev) return;

      // Prefetch terbatas — jangan stampede semua list API
      const routes =
        role === "OWNER"
          ? ["/dashboard/owner", "/transaksi"]
          : ["/kasir", "/transaksi"];

      routes.forEach((href, index) => {
        window.setTimeout(() => router.prefetch(href), index * 200);
      });

      // Picker hanya untuk karyawan (kasir)
      if (role !== "OWNER") {
        fetchPickerData().catch(() => {});
      }
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
