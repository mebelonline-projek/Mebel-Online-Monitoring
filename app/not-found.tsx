"use client";

// ============================================================
// 🚫 NOT FOUND — Halaman tidak ditemukan
// ============================================================

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="border border-border rounded-xl p-8 max-w-md text-center space-y-4">
        <div className="text-5xl mb-2">🔍</div>
        <h1 className="text-2xl font-bold text-foreground">404</h1>
        <h2 className="text-lg font-semibold text-foreground">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-muted-foreground text-sm">
          Halaman yang Anda cari tidak tersedia atau data yang diminta tidak
          ditemukan. Silakan periksa kembali tautan atau kembali ke beranda.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button className="gap-2" asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
