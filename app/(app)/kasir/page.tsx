import { KasirPageClient } from "@/components/transactions/kasir-page-client";

export default function KasirPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Kasir</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Input cepat transaksi — Ctrl+Enter untuk simpan
        </p>
      </div>

      <KasirPageClient />
    </div>
  );
}
