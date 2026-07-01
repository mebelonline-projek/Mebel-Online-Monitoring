"use client";

import dynamic from "next/dynamic";
import type { DashboardMonthlyData } from "@/lib/transactions";

// ⚡ Lazy load recharts (~600KB) — hanya saat dashboard dibuka
const OwnerChart = dynamic(
  () => import("./owner-chart").then((mod) => mod.OwnerChart),
  {
    loading: () => (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        Memuat grafik...
      </div>
    ),
    ssr: false,
  }
);

export function OwnerChartWrapper(props: { data: DashboardMonthlyData[]; period?: string }) {
  return <OwnerChart {...props} />;
}
