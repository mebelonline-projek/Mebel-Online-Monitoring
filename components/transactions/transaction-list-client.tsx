"use client";

// ============================================================
// 📋 TRANSACTION LIST — Daftar transaksi dengan filter
// ============================================================
// Tabel daftar transaksi dengan: filter status, search, pagination.
// ============================================================

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
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
} from "lucide-react";

interface TransactionItem {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  payment_type: "CASH" | "DP";
  dp_amount: number;
  status: string;
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
  profileRole: string;
  lunasCount: number;
  dpCount: number;
  menungguCount: number;
  batalCount: number;
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
  profileRole,
  lunasCount,
  dpCount,
  menungguCount,
  batalCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusValue, setStatusValue] = useState(initialStatus);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ q: searchQuery, status: statusValue }));
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusValue(newStatus);
    router.push(buildUrl({ status: newStatus, q: searchQuery }));
  };

  const goToPage = (page: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", page.toString());
    router.push(`/transaksi?${sp.toString()}`);
  };

  const isFiltered = searchQuery || statusValue !== "semua";

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
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola semua transaksi penjualan
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/transaksi/tambah">
            <Plus className="w-4 h-4" />
            Transaksi Baru
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
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
                router.push(buildUrl({ q: "", status: statusValue }));
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
                <Link href="/transaksi/tambah">
                  <Plus className="w-4 h-4" />
                  Transaksi Baru
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
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
    </div>
  );
}