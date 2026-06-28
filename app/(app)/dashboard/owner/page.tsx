import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import {
  getDashboardStats,
  type DashboardStats,
  type PeriodType,
} from "@/lib/transactions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { OwnerChart } from "./owner-chart";
import { Sparkline } from "./sparkline";
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
import { TrendingUp, TrendingDown, DollarSign, Percent, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const periodOptions: { label: string; value: PeriodType }[] = [
  { label: "Harian", value: "daily" },
  { label: "Mingguan", value: "weekly" },
  { label: "Bulanan", value: "monthly" },
  { label: "Tahunan", value: "yearly" },
];

function extractSparklineData(
  data: DashboardStats["monthlyData"],
  metric: "revenue" | "grossProfit" | "netProfit"
): number[] {
  return data.map((d) => d[metric]);
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerDashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile || profile.role !== "OWNER") redirect("/login");

  const params = await searchParams;
  const rawPeriod = params.period;
  const isValid = periodOptions.some((o) => o.value === rawPeriod);
  const period: PeriodType = isValid ? (rawPeriod as PeriodType) : "monthly";

  const stats: DashboardStats = await getDashboardStats(period);

  const revenueSparkline = extractSparklineData(stats.monthlyData, "revenue");
  const grossProfitSparkline = extractSparklineData(stats.monthlyData, "grossProfit");
  const netProfitSparkline = extractSparklineData(stats.monthlyData, "netProfit");
  const marginSparkline = stats.monthlyData.map((d) =>
    d.revenue > 0 ? Math.round((d.netProfit / d.revenue) * 10000) / 100 : 0
  );

  const kpiCards = [
    {
      title: "Uang Masuk",
      value: formatCurrency(stats.revenue),
      trend: stats.revenueTrend,
      icon: DollarSign,
      sparklineData: revenueSparkline,
    },
    {
      title: "Gross Profit",
      value: formatCurrency(stats.grossProfit),
      trend: stats.grossProfitTrend,
      icon: TrendingUp,
      sparklineData: grossProfitSparkline,
    },
    {
      title: "Net Profit",
      value: formatCurrency(stats.netProfit),
      trend: stats.netProfitTrend,
      icon: TrendingUp,
      sparklineData: netProfitSparkline,
    },
    {
      title: "Net Margin",
      value: `${stats.netMargin}%`,
      trend: stats.netMarginTrend,
      icon: Percent,
      sparklineData: marginSparkline,
    },
  ];
  const periodLabel =
    periodOptions.find((o) => o.value === period)?.label.toLowerCase() || "periode";

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financial Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {period === "daily" && "Performa hari ini vs kemarin (chart 30 hari terakhir)."}
            {period === "weekly" && "Performa minggu ini vs minggu lalu (chart 12 minggu terakhir)."}
            {period === "monthly" && "Performa bulan ini vs bulan lalu (chart 12 bulan terakhir)."}
            {period === "yearly" && "Performa tahun ini vs tahun lalu (chart 5 tahun terakhir)."}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {periodOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/dashboard/owner?period=${opt.value}`}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  period === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-primary text-foreground"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const sparkColor =
            card.trend >= 0
              ? "stroke-emerald-500 dark:stroke-emerald-400"
              : "stroke-destructive";
          return (
            <Card
              key={card.title}
              className="shadow-sm hover:-translate-y-1 transition-all duration-300"
            >
              <CardContent className="p-6 flex flex-col justify-between h-40">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    {card.title}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold inline-flex items-center gap-0.5 ${
                      card.trend >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {card.trend >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {card.trend >= 0 ? "+" : ""}
                    {card.trend}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs prev {periodLabel}</span>
                </div>
                {card.sparklineData.length >= 2 && (
                  <Sparkline data={card.sparklineData} trend={card.trend} className={sparkColor} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Chart */}
      {stats.monthlyData.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <OwnerChart data={stats.monthlyData} period={period} />
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            <Button variant="link" asChild className="gap-1 text-xs font-bold uppercase tracking-wider">
              <Link href="/transaksi">
                View All History
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>

          {stats.recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
              <span>Belum ada transaksi. Mulai catat transaksi pertama Anda!</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaksi</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-sm font-bold">
                      <Link href={`/transaksi/${tx.id}`} className="hover:text-primary transition-colors">
                        {tx.transaction_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{tx.customer_name}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(tx.final_price)}</TableCell>
                    <TableCell><StatusBadge status={tx.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(tx.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}