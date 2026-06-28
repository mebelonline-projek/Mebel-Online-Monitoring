// ============================================================
// ⏳ LOADING — Preview Invoice
// ============================================================

export default function InvoiceLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <div className="h-9 w-64 bg-accent/50 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-accent/30 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-accent/50 rounded-lg" />
          <div className="h-9 w-32 bg-accent/50 rounded-lg" />
        </div>
      </div>

      {/* Invoice card skeleton */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-accent/30" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-accent/50 rounded-lg" />
                <div className="h-3 w-36 bg-accent/30 rounded-lg" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="h-7 w-24 bg-accent/50 rounded-lg ml-auto" />
              <div className="h-4 w-36 bg-accent/30 rounded-lg" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-accent/50 rounded-lg" />
              <div className="h-4 w-full bg-accent/30 rounded-lg" />
              <div className="h-4 w-3/4 bg-accent/30 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-accent/50 rounded-lg" />
              <div className="h-4 w-full bg-accent/30 rounded-lg" />
              <div className="h-4 w-1/2 bg-accent/30 rounded-lg" />
            </div>
            {/* Table skeleton */}
            <div className="space-y-1">
              <div className="h-8 w-full bg-accent/50 rounded-lg" />
              <div className="h-8 w-full bg-accent/30 rounded-lg" />
            </div>
            {/* Summary skeleton */}
            <div className="ml-auto w-1/2 space-y-2">
              <div className="h-5 w-full bg-accent/30 rounded-lg" />
              <div className="h-5 w-full bg-accent/30 rounded-lg" />
              <div className="h-6 w-full bg-accent/50 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}