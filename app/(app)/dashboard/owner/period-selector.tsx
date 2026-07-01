"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PeriodType } from "@/lib/transactions";

const periodOptions: { label: string; value: PeriodType }[] = [
  { label: "Hari", value: "daily" },
  { label: "Minggu", value: "weekly" },
  { label: "Bulan", value: "monthly" },
  { label: "Tahun", value: "yearly" },
];

export function PeriodSelector({ currentPeriod }: { currentPeriod: PeriodType }) {
  const router = useRouter();

  return (
    <Tabs
      value={currentPeriod}
      onValueChange={(value) => router.push(`/dashboard/owner?period=${value}`)}
    >
      <TabsList variant="line" className="flex-wrap">
        {periodOptions.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}