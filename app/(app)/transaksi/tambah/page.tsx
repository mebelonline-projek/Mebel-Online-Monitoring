import { KasirPageClient } from "@/components/transactions/kasir-page-client";

export default function TambahTransaksiPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Transaksi Baru</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Input cepat — nama pelanggan, produk, dan pembayaran.
        </p>
      </div>

      <KasirPageClient />
    </div>
  );
}
