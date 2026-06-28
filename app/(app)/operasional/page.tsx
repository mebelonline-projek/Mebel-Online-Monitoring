import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OperationalCostListClient } from "@/components/operational-costs/operational-cost-list-client";

export const dynamic = "force-dynamic";

function getDefaultBulan(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDateRange(bulan: string): { start: string; end: string } {
  const [tahun, bulanNum] = bulan.split("-").map(Number);
  const start = `${tahun}-${String(bulanNum).padStart(2, "0")}-01`;
  // akhir bulan = tanggal 1 bulan berikutnya (untuk filter overlap)
  const nextMonth = bulanNum === 12 ? 1 : bulanNum + 1;
  const nextYear = bulanNum === 12 ? tahun + 1 : tahun;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start, end };
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

  const supabase = await createServerSupabaseClient();
  const params = await searchParams;
  const bulan = params.bulan || getDefaultBulan();
  const page = parseInt(params.page || "1", 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  const { start, end } = getDateRange(bulan);

  // Ambil semua biaya di bulan ini + total count
  let dbQuery = supabase
    .from("operational_costs")
    .select("*", { count: "exact" });

  // Filter by month range via period_start / period_end (overlap logic)
  dbQuery = dbQuery
    .lte("period_start", end)
    .gte("period_end", start);

  const { data: costs, count: total } = await dbQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((total || 0) / limit);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <OperationalCostListClient
        costs={costs || []}
        total={total || 0}
        currentPage={page}
        totalPages={totalPages}
        bulan={bulan}
        profileRole={profile.role}
      />
    </div>
  );
}