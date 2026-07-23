"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PeriodType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const periodOptions: { label: string; value: PeriodType }[] = [
  { label: "Hari", value: "daily" },
  { label: "Minggu", value: "weekly" },
  { label: "Bulan", value: "monthly" },
  { label: "Tahun", value: "yearly" },
];

export function PeriodSelector({ currentPeriod }: { currentPeriod: PeriodType }) {
  const router = useRouter();
  const [period, setPeriod] = useState(currentPeriod);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPending) setPeriod(currentPeriod);
  }, [currentPeriod, isPending]);

  return (
    <Tabs
      value={period}
      onValueChange={(value) => {
        const next = value as PeriodType;
        if (next === period) return;
        setPeriod(next);
        startTransition(() => {
          router.replace(`/dashboard/owner?period=${next}`, { scroll: false });
          // Paksa RSC refetch — hindari Router Cache menampilkan KPI lama (Rp 0)
          router.refresh();
        });
      }}
    >
      <TabsList
        variant="line"
        className={cn("flex-wrap", isPending && "opacity-70 pointer-events-none")}
      >
        {periodOptions.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
