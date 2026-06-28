import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { TransactionListClient } from "@/components/transactions/transaction-list-client";

export const dynamic = "force-dynamic";

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const params = await searchParams;
  const query = params.q || "";
  const status = params.status || "semua";
  const page = parseInt(params.page || "1", 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  // Build query
  let txQuery = supabase
    .from("transactions")
    .select(`
      id,
      transaction_number,
      customer_name,
      description,
      final_price,
      payment_type,
      dp_amount,
      status,
      created_at,
      updated_at,
      void_reason
    `, { count: "exact" });

  // Filter by status
  if (status && status !== "semua") {
    txQuery = txQuery.eq("status", status);
  }

  // Search
  if (query) {
    txQuery = txQuery.or(
      `transaction_number.ilike.%${query}%,customer_name.ilike.%${query}%`
    );
  }

  // Fetch total counts per status (iniiah yang akurat untuk stat cards)
  const [
    { data: transactions, count: total },
    { count: lunasCount },
    { count: dpCount },
    { count: menungguCount },
    { count: batalCount },
  ] = await Promise.all([
    txQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "LUNAS"),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "DP"),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "MENUNGGU_PELUNASAN"),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "BATAL"),
  ]);

  const txList = transactions || [];
  const totalCount = total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <TransactionListClient
        transactions={txList as any[]}
        total={totalCount}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        statusFilter={status}
        profileRole={profile.role}
        lunasCount={lunasCount || 0}
        dpCount={dpCount || 0}
        menungguCount={menungguCount || 0}
        batalCount={batalCount || 0}
      />
    </div>
  );
}