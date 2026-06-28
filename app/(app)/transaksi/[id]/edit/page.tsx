// ============================================================
// ✏️ EDIT TRANSAKSI
// ============================================================

import { redirect, notFound } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { TransactionForm } from "@/components/transactions/transaction-form";

export const dynamic = "force-dynamic";

export default async function EditTransaksiPage({
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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat transaksi: ${error.message}`);
  }

  if (!transaction) {
    notFound();
  }

  // Hanya transaksi DP murni (belum ada pelunasan) yang boleh diedit
  if (transaction.status !== "DP") {
    redirect(`/transaksi/${id}`);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Transaksi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit transaksi <span className="font-mono font-bold">{transaction.transaction_number}</span>
        </p>
      </div>

      {/* Form */}
      <TransactionForm
        isEdit
        transactionId={id}
        initialData={{
          customer_name: transaction.customer_name || "",
          description: transaction.description || "",
          final_price: transaction.final_price,
          payment_type: transaction.payment_type as "CASH" | "DP",
          dp_amount: transaction.dp_amount || 0,
        }}
      />
    </div>
  );
}