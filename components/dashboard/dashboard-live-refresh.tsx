"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Saat Owner/Karyawan kembali ke tab atau buka PWA lagi,
 * refresh RSC supaya KPI/transaksi baru dari user lain langsung terlihat
 * tanpa hard reload atau pindah menu.
 */
export function DashboardLiveRefresh() {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      // Hindari double-fire visibilitychange + focus
      if (now - lastRefreshAt.current < 1500) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
