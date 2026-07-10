"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OperationalCostListClient } from "@/components/operational-costs/operational-cost-list-client";
import { useProfile } from "@/components/providers/profile-context";
import { invalidateListCache, syncListUrl, useCachedList } from "@/lib/use-cached-list";
import type { OperationalCostRow } from "@/lib/operational-costs";

function getDefaultBulan(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface OperasionalListResponse {
  costs: OperationalCostRow[];
  total: number;
  totalPages: number;
  distinctCategories: string[];
}

function ListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

async function fetchOperasional(
  bulan: string,
  dari: string,
  sampai: string,
  page: number
): Promise<OperasionalListResponse> {
  const sp = new URLSearchParams({ page: String(page) });
  if (dari && sampai) {
    sp.set("dari", dari);
    sp.set("sampai", sampai);
  } else {
    sp.set("bulan", bulan);
  }
  const res = await fetch(`/api/operasional/list?${sp}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat biaya operasional");
  return json;
}

export function OperationalListPageClient() {
  const profile = useProfile();
  const searchParams = useSearchParams();
  const [bulan, setBulan] = useState(() => searchParams.get("bulan") || getDefaultBulan());
  const [dari, setDari] = useState(() => searchParams.get("dari") || "");
  const [sampai, setSampai] = useState(() => searchParams.get("sampai") || "");
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1", 10));

  useEffect(() => {
    setBulan(searchParams.get("bulan") || getDefaultBulan());
    setDari(searchParams.get("dari") || "");
    setSampai(searchParams.get("sampai") || "");
    setPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  const cacheKey = `operasional:${bulan}:${dari}:${sampai}:${page}`;
  const fetcher = useCallback(
    () => fetchOperasional(bulan, dari, sampai, page),
    [bulan, dari, sampai, page]
  );
  const { data, loading, error, revalidate } = useCachedList(cacheKey, fetcher);

  const handleBulanChange = useCallback((value: string) => {
    setBulan(value);
    setDari("");
    setSampai("");
    setPage(1);
    syncListUrl("/operasional", { bulan: value, page: 1 });
  }, []);

  const handleCustomRange = useCallback((newDari: string, newSampai: string) => {
    setDari(newDari);
    setSampai(newSampai);
    setPage(1);
    syncListUrl("/operasional", { dari: newDari, sampai: newSampai, page: 1 });
  }, []);

  const handleClearCustomRange = useCallback(
    (fallbackBulan: string) => {
      setDari("");
      setSampai("");
      setBulan(fallbackBulan);
      setPage(1);
      syncListUrl("/operasional", { bulan: fallbackBulan, page: 1 });
    },
    []
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      if (dari && sampai) {
        syncListUrl("/operasional", { dari, sampai, page: newPage });
      } else {
        syncListUrl("/operasional", { bulan, page: newPage });
      }
    },
    [bulan, dari, sampai]
  );

  const handleMutated = useCallback(() => {
    invalidateListCache("operasional:");
    revalidate();
  }, [revalidate]);

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  return (
    <OperationalCostListClient
      costs={data?.costs ?? []}
      total={data?.total ?? 0}
      currentPage={page}
      totalPages={data?.totalPages ?? 0}
      bulan={bulan}
      dari={dari}
      sampai={sampai}
      profileRole={profile.role}
      distinctCategories={data?.distinctCategories ?? []}
      onMutated={handleMutated}
      clientNav={{
        onBulanChange: handleBulanChange,
        onCustomRange: handleCustomRange,
        onClearCustomRange: handleClearCustomRange,
        onPageChange: handlePageChange,
      }}
    />
  );
}
