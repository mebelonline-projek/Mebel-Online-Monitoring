// ============================================================
// 🧾 NOTA / RECEIPT — Lihat & Cetak Nota Pembayaran
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { getStoreSettings } from "@/lib/store-queries";
import { notFound } from "next/navigation";
import { NotaDocument } from "@/components/nota/nota-document";

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // Ambil data transaksi
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      *,
      transaction_payments (*)
    `)
    .eq("id", id)
    .maybeSingle();

  // Bedakan: tidak ditemukan vs error koneksi
  if (error) {
    throw new Error(`Gagal memuat transaksi: ${error.message}`);
  }

  if (!transaction) {
    notFound();
  }

  // Ambil data toko
  const settings = await getStoreSettings();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <NotaDocument
        transaction_id={id}
        transaction_number={(transaction as any).transaction_number}
        customer_name={(transaction as any).customer_name || "—"}
        product_name={(transaction as any).description || "—"}
        final_price={(transaction as any).final_price}
        payment_type={(transaction as any).payment_type}
        dp_amount={(transaction as any).dp_amount}
        status={(transaction as any).status}
        created_at={(transaction as any).created_at}
        payments={(transaction as any).transaction_payments || []}
        store_name={settings?.store_name ?? undefined}
        store_address={settings?.address ?? undefined}
        store_phone={settings?.phone ?? undefined}
        logo_url={settings?.logo_url ?? "/logo.webp"}
      />
    </div>
  );
}