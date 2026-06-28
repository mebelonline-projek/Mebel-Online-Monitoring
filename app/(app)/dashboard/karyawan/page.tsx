import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, createServerSupabaseClient } from "@/lib/supabase-server";
import { getWibDayBounds } from "@/lib/date-utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Receipt,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KaryawanDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile || profile.role !== "KARYAWAN") redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { start: todayStart, end: todayEnd } = getWibDayBounds();

  // Parallel queries — 4 query sekaligus
  const [
    { data: transactions },
    { count: todayCount },
    { count: pendingCount },
    { count: completedCount },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, transaction_number, customer_name, final_price, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .in("status", ["DP", "MENUNGGU_PELUNASAN"]),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "LUNAS")
      .gte("updated_at", todayStart)
      .lte("updated_at", todayEnd),
  ]);

  const txList = transactions || [];
  const pendingTx = txList.filter((t) => t.status === "DP" || t.status === "MENUNGGU_PELUNASAN");

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = days[new Date().getDay()];
  const dateStr = new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const kpiCards = [
    {
      title: "Transaksi Hari Ini",
      value: todayCount || 0,
      icon: Receipt,
    },
    {
      title: "Menunggu Pelunasan",
      value: pendingCount || 0,
      icon: Clock,
    },
    {
      title: "Lunas Hari Ini",
      value: completedCount || 0,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {todayName}, {dateStr}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" asChild className="gap-2">
            <Link href="/transaksi">
              <Search className="w-4 h-4" />
              Cari Transaksi
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/transaksi/tambah">
              <Plus className="w-4 h-4" />
              Transaksi Baru
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-1">{kpi.title}</p>
                <p className="text-4xl md:text-5xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-6">Perlu Tindakan</h3>
            {pendingTx.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Tidak ada tindakan tertunda
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTx.slice(0, 5).map((tx) => (
                  <Link
                    key={tx.id}
                    href={`/transaksi/${tx.id}`}
                    className="block p-4 rounded-lg bg-accent border border-border hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center text-xs px-3 py-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Menunggu Bayar
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">
                      {tx.customer_name || "—"}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {tx.transaction_number}
                    </p>
                    <p className="text-foreground font-semibold text-sm mt-1">
                      {formatCurrency(tx.final_price)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Transaksi Terbaru</h3>
              <Button variant="link" asChild className="text-sm">
                <Link href="/transaksi">
                  Lihat Semua
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            {txList.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Belum ada transaksi
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txList.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/transaksi/${tx.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {tx.transaction_number}
                        </Link>
                      </TableCell>
                      <TableCell>{tx.customer_name || "—"}</TableCell>
                      <TableCell>{formatCurrency(tx.final_price)}</TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
