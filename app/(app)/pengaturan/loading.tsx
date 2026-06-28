// ============================================================
// ⏳ LOADING — Pengaturan Toko
// ============================================================

export default function PengaturanLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="mb-6">
        <div className="h-9 w-52 bg-accent/50 rounded-lg" />
        <div className="h-4 w-64 bg-accent/30 rounded-lg mt-2" />
      </div>

      <div className="space-y-8">
        {/* Logo skeleton */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="h-6 w-28 bg-accent/50 rounded-lg mb-4" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-32 h-32 rounded-xl bg-accent/30" />
            <div className="space-y-3">
              <div className="h-10 w-36 bg-accent/50 rounded-lg" />
              <div className="h-3 w-48 bg-accent/30 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Info toko skeleton */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="h-6 w-32 bg-accent/50 rounded-lg mb-4" />
          <div className="space-y-4">
            <div className="h-10 w-full bg-accent/30 rounded-lg" />
            <div className="h-20 w-full bg-accent/30 rounded-lg" />
            <div className="h-10 w-full bg-accent/30 rounded-lg" />
            <div className="h-10 w-44 bg-accent/50 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}