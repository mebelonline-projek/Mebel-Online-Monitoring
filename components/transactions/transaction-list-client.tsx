"use client";

// ============================================================
// 📋 TRANSACTION LIST — Daftar transaksi dengan filter
// ============================================================
// Tabel daftar transaksi dengan: filter status, search, pagination.
// ============================================================

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { FulfillmentBadge } from "@/components/shared/fulfillment-badge";
import { FULFILLMENT_STATUSES } from "@/config/fulfillment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Eye,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from "lucide-react";
import { downloadCsv } from "@/lib/export-csv";

interface TransactionItem {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  payment_type: "CASH" | "DP";
  dp_amount: number;
  status: string;
  fulfillment_status?: string;
  created_at: string;
  updated_at: string;
  void_reason: string | null;
}

interface Props {
  transactions: TransactionItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  query: string;
  statusFilter: string;
  fulfillmentFilter: string;
  profileRole: string;
  lunasCount: number;
  dpCount: number;
  menungguCount: number;
  batalCount: number;
  clientNav?: {
    onQueryChange: (q: string) => void;
    onStatusChange: (status: string) => void;
    onFulfillmentChange: (fulfillment: string) => void;
    onPageChange: (page: number) => void;
  };
}

const STATUS_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "LUNAS", label: "Lunas" },
  { value: "DP", label: "DP" },
  { value: "MENUNGGU_PELUNASAN", label: "Menunggu Pelunasan" },
  { value: "BATAL", label: "Batal" },
];

export function TransactionListClient({
  transactions,
  total,
  currentPage,
  totalPages,
  query: initialQuery,
  statusFilter: initialStatus,
  fulfillmentFilter: initialFulfillment,
  profileRole,
  lunasCount,
  dpCount,
  menungguCount,
  batalCount,
  clientNav,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusValue, setStatusValue] = useState(initialStatus);
  const [fulfillmentValue, setFulfillmentValue] = useState(initialFulfillment);

  useEffect(() => {
    setSearchQuery(initialQuery);
    setStatusValue(initialStatus);
    setFulfillmentValue(initialFulfillment);
  }, [initialQuery, initialStatus, initialFulfillment]);

  const buildUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      });
      sp.set("page", "1");
      return `/transaksi?${sp.toString()}`;
    },
    [searchParams]
  );

  const navigate = useCallback(
    (url: string) => {
      if (clientNav) return;
      startTransition(() => {
        router.push(url);
      });
    },
    [router, clientNav]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientNav) {
      clientNav.onQueryChange(searchQuery);
      return;
    }
    navigate(buildUrl({ q: searchQuery, status: statusValue, fulfillment: fulfillmentValue }));
  };

  useEffect(() => {
    if (searchQuery === initialQuery) return;
    const timer = setTimeout(() => {
      if (clientNav) clientNav.onQueryChange(searchQuery);
      else navigate(buildUrl({ q: searchQuery, status: statusValue, fulfillment: fulfillmentValue }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, statusValue, fulfillmentValue, initialQuery, navigate, buildUrl, clientNav]);

  const handleStatusChange = (newStatus: string) => {
    setStatusValue(newStatus);
    if (clientNav) {
      clientNav.onStatusChange(newStatus);
      return;
    }
    navigate(buildUrl({ status: newStatus, q: searchQuery, fulfillment: fulfillmentValue }));
  };

  const handleFulfillmentChange = (newFulfillment: string) => {
    setFulfillmentValue(newFulfillment);
    if (clientNav) {
      clientNav.onFulfillmentChange(newFulfillment);
      return;
    }
    navigate(buildUrl({ fulfillment: newFulfillment, q: searchQuery, status: statusValue }));
  };

  const goToPage = (page: number) => {
    if (clientNav) {
      clientNav.onPageChange(page);
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", page.toString());
    navigate(`/transaksi?${sp.toString()}`);
  };

  const isFiltered = searchQuery || statusValue !== "semua" || fulfillmentValue !== "semua";
  const isOwner = profileRole === "OWNER";

  const handleExportCsv = () => {
    downloadCsv(`transaksi-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["No Transaksi", "Pelanggan", "Deskripsi", "Harga", "Bayar", "Pesanan", "Tanggal"],
      ...transactions.map((tx) => [
        tx.transaction_number,
        tx.customer_name || "",
        tx.description || "",
        tx.final_price.toString(),
        tx.status,
        tx.fulfillment_status || "MENUNGGU",
        tx.created_at,
      ]),
    ]);
    toast.success("CSV berhasil diunduh");
  };

  const statCards = [
    {
      label: "Total Transaksi",
      value: total,
      icon: Receipt,
      className: "text-foreground",
    },
    {
      label: "Lunas",
      value: lunasCount,
      icon: CheckCircle,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Menunggu",
      value: dpCount + menungguCount,
      icon: Clock,
      className: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Batal",
      value: batalCount,
      icon: XCircle,
      className: "text-destructive",
    },
  ];

  return (
    <div className={`space-y-6 p-4 md:p-6 lg:p-8 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola semua transaksi penjualan
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isOwner && transactions.length > 0 && (
            <Button variant="outline" onClick={handleExportCsv} className="gap-2 min-h-[44px]">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
          <Button asChild className="gap-2 min-h-[44px]">
            <Link href="/kasir">
              <Plus className="w-4 h-4" />
              Transaksi Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Cari
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                router.push(buildUrl({ q: "", status: statusValue, fulfillment: fulfillmentValue }));
              }}
            >
              Reset
            </Button>
          )}
        </form>

        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusValue === opt.value ? "default" : "outline"}
              size="xs"
              onClick={() => handleStatusChange(opt.value)}
              className="rounded-full text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground self-center mr-1">Pesanan:</span>
          <Button
            variant={fulfillmentValue === "semua" ? "default" : "outline"}
            size="xs"
            onClick={() => handleFulfillmentChange("semua")}
            className="rounded-full text-xs"
          >
            Semua
          </Button>
          {FULFILLMENT_STATUSES.map((opt) => (
            <Button
              key={opt.value}
              variant={fulfillmentValue === opt.value ? "default" : "outline"}
              size="xs"
              onClick={() => handleFulfillmentChange(opt.value)}
              className="rounded-full text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${stat.className}`}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content */}
      {transactions.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {isFiltered ? "Transaksi Tidak Ditemukan" : "Belum Ada Transaksi"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {searchQuery
                ? `Tidak ada transaksi dengan kata kunci "${searchQuery}"`
                : "Buat transaksi pertama untuk mulai mencatat penjualan."}
            </p>
            {!isFiltered && (
              <Button asChild variant="outline" className="mt-4 gap-2">
                <Link href="/kasir">
                  <Plus className="w-4 h-4" />
                  Transaksi Baru
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className="shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/transaksi/${tx.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{tx.transaction_number}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <StatusBadge status={tx.status} />
                      {tx.fulfillment_status && tx.status !== "BATAL" && (
                        <FulfillmentBadge status={tx.fulfillment_status} />
                      )}
                    </div>
                  </div>
                  <p className="font-semibold truncate">{tx.customer_name || "Tanpa nama"}</p>
                  {tx.description && (
                    <p className="text-muted-foreground text-sm truncate">{tx.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground text-xs">{formatDate(tx.created_at)}</span>
                    <span className="font-bold text-primary">{formatCurrency(tx.final_price)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status Bayar</TableHead>
                    <TableHead>Pesanan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/transaksi/${tx.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-bold">
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {tx.customer_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tx.description || "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(tx.final_price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell>
                        {tx.status !== "BATAL" && tx.fulfillment_status ? (
                          <FulfillmentBadge status={tx.fulfillment_status} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/transaksi/${tx.id}`);
                          }}
                          aria-label="Lihat detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Halaman {currentPage} dari {totalPages} ({total} transaksi)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="gap-1"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* FAB mobile */}
      <Button
        asChild
        size="lg"
        className="lg:hidden fixed fab-bottom right-4 z-40 h-14 w-14 rounded-full shadow-lg p-0"
      >
        <Link href="/kasir" aria-label="Transaksi baru">
          <Plus className="w-6 h-6" />
        </Link>
      </Button>
    </div>
  );
}