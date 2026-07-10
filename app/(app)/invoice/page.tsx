import { Suspense } from "react";
import { InvoiceListPageClient } from "@/components/invoice/invoice-list-page-client";

function InvoiceListFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-8">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<InvoiceListFallback />}>
      <InvoiceListPageClient />
    </Suspense>
  );
}
