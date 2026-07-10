import { Suspense } from "react";
import { CustomerListPageClient } from "@/components/customers/customer-list-page-client";

function CustomerListFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export default function CustomerPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <Suspense fallback={<CustomerListFallback />}>
        <CustomerListPageClient />
      </Suspense>
    </div>
  );
}
