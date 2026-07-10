import { Suspense } from "react";
import { TransactionListPageClient } from "@/components/transactions/transaction-list-page-client";

function TransactionListFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense fallback={<TransactionListFallback />}>
      <TransactionListPageClient />
    </Suspense>
  );
}
