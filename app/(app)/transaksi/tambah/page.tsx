// ============================================================
// ➕ TAMBAH TRANSAKSI
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { TransactionForm } from "@/components/transactions/transaction-form";

export const dynamic = "force-dynamic";

export default async function TambahTransaksiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Transaksi Baru</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Catat transaksi penjualan baru — pilih pelanggan, produk, dan tipe pembayaran.
        </p>
      </div>

      {/* Form */}
      <TransactionForm />
    </div>
  );
}