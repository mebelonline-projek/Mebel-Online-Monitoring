import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getTransactionsPageData } from "@/lib/transactions";
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

  const params = await searchParams;
  const query = params.q || "";
  const status = params.status || "semua";
  const page = parseInt(params.page || "1", 10);

  // ⚡ Pakai cached function — data di-cache 30 detik di server
  const result = await getTransactionsPageData({ q: query, status, page, limit: 10 });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <TransactionListClient
        transactions={result.transactions as any[]}
        total={result.total}
        currentPage={page}
        totalPages={result.totalPages}
        query={query}
        statusFilter={status}
        profileRole={profile.role}
        lunasCount={result.lunasCount}
        dpCount={result.dpCount}
        menungguCount={result.menungguCount}
        batalCount={result.batalCount}
      />
    </div>
  );
}
