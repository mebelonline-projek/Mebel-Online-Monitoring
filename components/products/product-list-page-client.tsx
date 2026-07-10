"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductListClient } from "@/components/products/product-list-client";
import { useProfile } from "@/components/providers/profile-context";
import { invalidateListCache, syncListUrl, useCachedList } from "@/lib/use-cached-list";
import type { ProductRow } from "@/lib/products";

interface ProductsListResponse {
  products: ProductRow[];
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

async function fetchProducts(q: string, page: number): Promise<ProductsListResponse> {
  const sp = new URLSearchParams({ page: String(page) });
  if (q) sp.set("q", q);
  const res = await fetch(`/api/products/list?${sp}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat produk");
  return json;
}

export function ProductListPageClient() {
  const profile = useProfile();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1", 10));

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  const cacheKey = `products:${q}:${page}`;
  const fetcher = useCallback(() => fetchProducts(q, page), [q, page]);
  const { data, loading, error, revalidate } = useCachedList(cacheKey, fetcher);

  const handleQueryChange = useCallback((newQ: string) => {
    setQ(newQ);
    setPage(1);
    syncListUrl("/produk", { q: newQ, page: 1 });
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      syncListUrl("/produk", { q, page: newPage });
    },
    [q]
  );

  const handleMutated = useCallback(() => {
    invalidateListCache("products:");
    revalidate();
  }, [revalidate]);

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  return (
    <ProductListClient
      products={data?.products ?? []}
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
