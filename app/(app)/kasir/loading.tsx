export default function KasirLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-96 bg-muted/50 rounded-xl animate-pulse" />
    </div>
  );
}
