"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TransactionListClient } from "@/components/transactions/transaction-list-client";
import { useProfile } from "@/components/providers/profile-context";
import { invalidateTransactionRelatedCaches, syncListUrl, useCachedList } from "@/lib/use-cached-list";

interface TransactionListResponse {
  transactions: Array<{
    id: string;
    transaction_number: string;
    customer_name: string | null;
    description: string | null;
    final_price: number;
    payment_type: "CASH" | "DP";
    dp_amount: number;
    status: string;
    fulfillment_status?: string;
    created_at: string;
    updated_at: string;
    void_reason: string | null;
  }>;
  total: number;
  totalPages: number;
  lunasCount: number;
  dpCount: number;
  menungguCount: number;
  batalCount: number;
}

function ListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

async function fetchTransactions(
  q: string,
  status: string,
  fulfillment: string,
  page: number
): Promise<TransactionListResponse> {
  const sp = new URLSearchParams({ page: String(page), status, fulfillment });
  if (q) sp.set("q", q);
  const res = await fetch(`/api/transactions/list?${sp}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat transaksi");
  return json;
}

export function TransactionListPageClient({
  initialData,
  initialQ = "",
  initialStatus = "semua",
  initialFulfillment = "semua",
  initialPage = 1,
}: {
  initialData?: TransactionListResponse;
  initialQ?: string;
  initialStatus?: string;
  initialFulfillment?: string;
  initialPage?: number;
}) {
  const profile = useProfile();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || initialQ);
  const [status, setStatus] = useState(() => searchParams.get("status") || initialStatus);
  const [fulfillment, setFulfillment] = useState(
    () => searchParams.get("fulfillment") || initialFulfillment
  );
  const [page, setPage] = useState(
    () => parseInt(searchParams.get("page") || String(initialPage), 10)
  );

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setStatus(searchParams.get("status") || "semua");
    setFulfillment(searchParams.get("fulfillment") || "semua");
    setPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  const cacheKey = `transactions:${q}:${status}:${fulfillment}:${page}`;
  const fetcher = useCallback(
    () => fetchTransactions(q, status, fulfillment, page),
    [q, status, fulfillment, page]
  );

  const seedMatches =
    initialData &&
    q === initialQ &&
    status === initialStatus &&
    fulfillment === initialFulfillment &&
    page === initialPage;

  const { data, loading, error } = useCachedList(
    cacheKey,
    fetcher,
    seedMatches ? initialData : undefined
  );

  const sync = useCallback(
    (next: { q?: string; status?: string; fulfillment?: string; page?: number }) => {
      const nq = next.q ?? q;
      const ns = next.status ?? status;
      const nf = next.fulfillment ?? fulfillment;
      const np = next.page ?? page;
      setQ(nq);
      setStatus(ns);
      setFulfillment(nf);
      setPage(np);
      syncListUrl("/transaksi", {
        q: nq,
        status: ns !== "semua" ? ns : undefined,
        fulfillment: nf !== "semua" ? nf : undefined,
        page: np,
      });
    },
    [q, status, fulfillment, page]
  );

  const clientNav = {
    onQueryChange: (newQ: string) => sync({ q: newQ, page: 1 }),
    onStatusChange: (newStatus: string) => sync({ status: newStatus, page: 1 }),
    onFulfillmentChange: (newFulfillment: string) => sync({ fulfillment: newFulfillment, page: 1 }),
    onPageChange: (newPage: number) => sync({ page: newPage }),
  };

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  return (
    <TransactionListClient
      transactions={data?.transactions ?? []}
      total={data?.total ?? 0}
      currentPage={page}
      totalPages={data?.totalPages ?? 0}
      query={q}
      statusFilter={status}
      fulfillmentFilter={fulfillment}
      profileRole={profile.role}
      lunasCount={data?.lunasCount ?? 0}
      dpCount={data?.dpCount ?? 0}
      menungguCount={data?.menungguCount ?? 0}
      batalCount={data?.batalCount ?? 0}
      clientNav={clientNav}
    />
  );
}

export function invalidateTransactionListCache() {
  invalidateTransactionRelatedCaches();
}
