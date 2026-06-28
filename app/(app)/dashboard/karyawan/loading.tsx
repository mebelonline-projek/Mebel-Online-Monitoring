import { Skeleton } from "@/components/ui/skeleton";

export default function KaryawanDashboardLoading() {
  return (
    <div className="bg-background min-h-screen text-foreground">
      <div className="p-4 md:p-10" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-[24px] shadow-sm p-6">
              <Skeleton className="h-12 w-12 rounded-xl mb-4" />
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-[24px] shadow-sm p-6" style={{ height: "500px" }}>
            <Skeleton className="h-6 w-40 mb-6" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[16px] mb-4" />
            ))}
          </div>
          <div className="lg:col-span-2 bg-card border border-border rounded-[24px] shadow-sm p-6" style={{ height: "500px" }}>
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-4 border-b border-border">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}