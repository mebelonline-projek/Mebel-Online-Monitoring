"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerListClient } from "@/components/customers/customer-list-client";
import { useProfile } from "@/components/providers/profile-context";
import { invalidateListCache, syncListUrl, useCachedList } from "@/lib/use-cached-list";
import type { CustomerRow } from "@/lib/customers";

interface CustomersListResponse {
  customers: CustomerRow[];
  total: number;
  totalPages: number;
}

function ListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="h-10 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

async function fetchCustomers(q: string, page: number): Promise<CustomersListResponse> {
  const sp = new URLSearchParams({ page: String(page) });
  if (q) sp.set("q", q);
  const res = await fetch(`/api/customers/list?${sp}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat pelanggan");
  return json;
}

export function CustomerListPageClient() {
  const profile = useProfile();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1", 10));

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  const cacheKey = `customers:${q}:${page}`;
  const fetcher = useCallback(() => fetchCustomers(q, page), [q, page]);
  const { data, loading, error, revalidate } = useCachedList(cacheKey, fetcher);

  const handleQueryChange = useCallback((newQ: string) => {
    setQ(newQ);
    setPage(1);
    syncListUrl("/customer", { q: newQ, page: 1 });
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      syncListUrl("/customer", { q, page: newPage });
    },
    [q]
  );

  const handleMutated = useCallback(() => {
    invalidateListCache("customers:");
    revalidate();
  }, [revalidate]);

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  return (
    <CustomerListClient
      customers={data?.customers ?? []}
      total={data?.total ?? 0}
      currentPage={page}
      totalPages={data?.totalPages ?? 0}
      query={q}
      profileRole={profile.role}
      onMutated={handleMutated}
      clientNav={{ onQueryChange: handleQueryChange, onPageChange: handlePageChange }}
    />
  );
}
