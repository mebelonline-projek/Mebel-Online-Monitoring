// ============================================================
// 💰 INPUT PELUNASAN
// ============================================================

import { redirect, notFound } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { PelunasanFormClient } from "./pelunasan-form-client";

export const dynamic = "force-dynamic";

export default async function PelunasanPage({
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

  // Fetch transaksi
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      id,
      transaction_number,
      customer_name,
      final_price,
      status,
      payment_type
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

  // Tolak jika sudah LUNAS atau BATAL
  if (transaction.status === "LUNAS" || transaction.status === "BATAL") {
    redirect(`/transaksi/${id}`);
  }

  // Fetch existing payments
  const { data: payments } = await supabase
    .from("transaction_payments")
    .select("*")
    .eq("transaction_id", id)
    .order("payment_date", { ascending: true });

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = transaction.final_price - totalPaid;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-xl mx-auto">
      <PelunasanFormClient
        transactionId={id}
        invoiceNumber={transaction.transaction_number}
        finalPrice={transaction.final_price}
        totalPaid={totalPaid}
        remaining={remaining}
        customerName={transaction.customer_name || "—"}
        existingPayments={(payments || []) as any[]}
      />
    </div>
  );
}