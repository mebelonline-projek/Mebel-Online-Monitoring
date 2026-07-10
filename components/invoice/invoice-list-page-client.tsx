"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InvoiceListClient } from "@/components/invoice/invoice-list-client";
import { invalidateListCache, syncListUrl, useCachedList } from "@/lib/use-cached-list";

interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  total_paid: number;
  remaining_amount: number;
  created_at: string;
}

interface InvoicesListResponse {
  success: boolean;
  data: InvoiceItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  message?: string;
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

async function fetchInvoices(q: string, status: string, page: number): Promise<InvoicesListResponse> {
  const sp = new URLSearchParams({ page: String(page), status });
  if (q) sp.set("q", q);
  const res = await fetch(`/api/invoices/list?${sp}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat invoice");
  return json;
}

export function InvoiceListPageClient() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(() => searchParams.get("status") || "semua");
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1", 10));

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setStatus(searchParams.get("status") || "semua");
    setPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  const cacheKey = `invoices:${q}:${status}:${page}`;
  const fetcher = useCallback(() => fetchInvoices(q, status, page), [q, status, page]);
  const { data, loading, error, revalidate } = useCachedList(cacheKey, fetcher);

  const handleFilterChange = useCallback((newQ: string, newStatus: string) => {
    setQ(newQ);
    setStatus(newStatus);
    setPage(1);
    syncListUrl("/invoice", { q: newQ, status: newStatus === "semua" ? undefined : newStatus, page: 1 });
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      syncListUrl("/invoice", {
        q,
        status: status === "semua" ? undefined : status,
        page: newPage,
      });
    },
    [q, status]
  );

  const handleMutated = useCallback(() => {
    invalidateListCache("invoices:");
    revalidate();
  }, [revalidate]);

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  return (
    <InvoiceListClient
      invoices={data?.data ?? []}
      total={data?.total ?? 0}
      currentPage={page}
      totalPages={data?.totalPages ?? 0}
      query={q}
      statusFilter={status}
      onMutated={handleMutated}
      clientNav={{ onFilterChange: handleFilterChange, onPageChange: handlePageChange }}
    />
  );
}
