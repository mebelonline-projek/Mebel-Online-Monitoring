// ============================================================
// 🧾 KELOLA HPP — Tambah/Edit/Hapus HPP per transaksi
// ============================================================

import { redirect, notFound } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { HppManagerClient } from "./hpp-manager-client";

export const dynamic = "force-dynamic";

export default async function KelolaHppPage({
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

  // Fetch transaksi info
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      id,
      transaction_number,
      final_price,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat transaksi: ${error.message}`);
  }

  if (!transaction) {
    notFound();
  }

  // Fetch existing HPP items
  const { data: hppItems } = await supabase
    .from("hpp_items")
    .select("*")
    .eq("transaction_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <HppManagerClient
        transactionId={id}
        invoiceNumber={transaction.transaction_number}
        transactionStatus={transaction.status}
        hppItems={(hppItems || []) as any[]}
      />
    </div>
  );
}