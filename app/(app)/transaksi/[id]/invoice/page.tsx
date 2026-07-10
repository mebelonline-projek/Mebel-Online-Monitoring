// ============================================================
// 🧾 NOTA / RECEIPT — Lihat & Cetak Nota Pembayaran
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { getStoreSettings } from "@/lib/store-queries";
import { notFound } from "next/navigation";
import { NotaDocument } from "@/components/nota/nota-document";
import { mapTransactionLineItems } from "@/lib/pdf-invoice";

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
      transaction_payments (*),
      transaction_items (*)
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

  const tx = transaction as {
    transaction_number: string;
    customer_name: string | null;
    description: string | null;
    final_price: number;
    payment_type: string;
    dp_amount: number;
    status: string;
    created_at: string;
    transaction_payments: Array<{
      id: string;
      amount: number;
      payment_date: string;
      method: string;
      note: string | null;
    }>;
    transaction_items?: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      note: string | null;
      sort_order: number;
    }>;
  };

  const lineItems = mapTransactionLineItems(tx.transaction_items, {
    description: tx.description,
    final_price: tx.final_price,
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <NotaDocument
        transaction_id={id}
        transaction_number={tx.transaction_number}
        customer_name={tx.customer_name || "—"}
        lineItems={lineItems}
        final_price={tx.final_price}
        payment_type={tx.payment_type}
        dp_amount={tx.dp_amount}
        status={tx.status}
        created_at={tx.created_at}
        payments={tx.transaction_payments || []}
        store_name={settings?.store_name ?? undefined}
        store_address={settings?.address ?? undefined}
        store_phone={settings?.phone ?? undefined}
        logo_url={settings?.logo_url ?? "/logo.webp"}
      />
    </div>
  );
}