// ============================================================
// 🔍 DETAIL TRANSAKSI
// ============================================================

import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { TransactionDetailClient } from "@/components/transactions/transaction-detail-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DetailTransaksiPage({
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

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      *,
      hpp_items (*),
      transaction_payments (*, created_by),
      transaction_items (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat transaksi: ${error.message}`);
  }

  if (!transaction) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <TransactionDetailClient
        transaction={transaction as any}
        profileRole={profile.role}
        userId={user.id}
      />
    </div>
  );
}