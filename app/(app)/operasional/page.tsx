import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getOperationalCostsList } from "@/lib/operational-costs";
import { OperationalCostListClient } from "@/components/operational-costs/operational-cost-list-client";

export const dynamic = "force-dynamic";

function getDefaultBulan(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function OperasionalPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const bulan = params.bulan || getDefaultBulan();
  const page = parseInt(params.page || "1", 10);

  // ⚡ Pakai cached function — data di-cache 30 detik di server
  const result = await getOperationalCostsList({ bulan, page, limit: 10 });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <OperationalCostListClient
        costs={result.costs}
        total={result.total}
        currentPage={page}
        totalPages={result.totalPages}
        bulan={bulan}
        profileRole={profile.role}
        distinctCategories={result.distinctCategories}
      />
    </div>
  );
}
