"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function KaryawanDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Karyawan dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-[24px] shadow-sm p-8 max-w-md text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-foreground">
          Gagal Memuat Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Terjadi kesalahan saat mengambil data dashboard. Silakan coba lagi.
        </p>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}