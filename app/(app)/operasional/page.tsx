import { Suspense } from "react";
import { OperationalListPageClient } from "@/components/operational-costs/operational-list-page-client";

function OperasionalListFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export default function OperasionalPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <Suspense fallback={<OperasionalListFallback />}>
        <OperationalListPageClient />
      </Suspense>
    </div>
  );
}
