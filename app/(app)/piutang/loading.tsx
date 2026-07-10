export default function PiutangLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
      <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
    </div>
  );
}
