import { Suspense } from "react";
import { getTransactionsPageData } from "@/lib/transactions";
import { TransactionListPageClient } from "@/components/transactions/transaction-list-page-client";

function TransactionListFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    fulfillment?: string;
    page?: string;
  }>;
}

async function TransaksiPageContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "semua";
  const fulfillment = params.fulfillment || "semua";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const initialData = await getTransactionsPageData({
    q,
    status,
    fulfillment,
    page,
    limit: 10,
  });

  return (
    <TransactionListPageClient
      initialData={initialData}
      initialQ={q}
      initialStatus={status}
      initialFulfillment={fulfillment}
      initialPage={page}
    />
  );
}

export default function TransaksiPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<TransactionListFallback />}>
      <TransaksiPageContent searchParams={searchParams} />
    </Suspense>
  );
}
