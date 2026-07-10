import { Suspense } from "react";
import { PiutangPageClient } from "@/components/piutang/piutang-page-client";

function PiutangFallback() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-32 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export default function PiutangPage() {
  return (
    <Suspense fallback={<PiutangFallback />}>
      <PiutangPageClient />
    </Suspense>
  );
}
