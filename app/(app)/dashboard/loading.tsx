import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 lg:px-8 lg:py-6 lg:pb-12 max-w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Skeleton className="h-9 w-36 rounded" />
            <Skeleton className="h-9 w-36 rounded" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 flex flex-col justify-between" style={{ height: "160px" }}>
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-40 mb-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="rounded-2xl overflow-hidden glass-panel">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}