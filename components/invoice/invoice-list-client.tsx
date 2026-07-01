"use client";

// ============================================================
// 🧾 INVOICE LIST — Daftar invoice
// ============================================================
// Tabel daftar invoice terpisah dari transaksi.
// ============================================================

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  total_paid: number;
  remaining_amount: number;
  created_at: string;
}

interface Props {
  invoices: InvoiceItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  query: string;
  statusFilter: string;
}

const STATUS_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Terkirim" },
  { value: "PAID", label: "Lunas" },
  { value: "CANCELLED", label: "Batal" },
];

export function InvoiceListClient({
  invoices,
  total,
  currentPage,
  totalPages,
  query: initialQuery,
  statusFilter: initialStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusValue, setStatusValue] = useState(initialStatus);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);

  const buildUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      });
      sp.set("page", "1");
      return `/invoice?${sp.toString()}`;
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
    router.push(`/invoice?${sp.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(`Invoice ${deleteTarget.number} berhasil dihapus`);
      setDeleteTarget(null);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus invoice");
    }
  };

  const isFiltered = searchQuery || statusValue !== "semua";

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoice</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola faktur & surat tagihan pelanggan</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/invoice/buat">
            <Plus className="w-4 h-4" />
            Buat Invoice
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari invoice atau pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Cari</Button>
          {searchQuery && (
            <Button type="button" variant="outline" onClick={() => {
              setSearchQuery("");
              router.push(buildUrl({ q: "", status: statusValue }));
            }}>Reset</Button>
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

      {/* Content */}
      {invoices.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {isFiltered ? "Invoice Tidak Ditemukan" : "Belum Ada Invoice"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {searchQuery
                ? `Tidak ada invoice dengan kata kunci "${searchQuery}"`
                : "Buat invoice untuk pelanggan yang membutuhkan faktur."}
            </p>
            {!isFiltered && (
              <Button asChild variant="outline" className="mt-4 gap-2">
                <Link href="/invoice/buat">
                  <Plus className="w-4 h-4" />
                  Buat Invoice Pertama
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
                    <TableHead>Invoice</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Dibayar</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/invoice/${inv.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-bold">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {inv.customer_name || "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(inv.total_amount)}
                      </TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.total_paid)}
                      </TableCell>
                      <TableCell className={inv.remaining_amount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                        {inv.remaining_amount > 0 ? formatCurrency(inv.remaining_amount) : "✓ Lunas"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            inv.status === "PAID" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            inv.status === "DRAFT" ? "bg-muted text-muted-foreground" :
                            inv.status === "SENT" ? "bg-primary/10 text-primary" :
                            "bg-destructive/10 text-destructive"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(inv.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: inv.id, number: inv.invoice_number });
                          }}
                          aria-label="Hapus invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                Halaman {currentPage} dari {totalPages} ({total} invoice)
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

      {/* Delete Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus invoice <strong className="text-foreground">{deleteTarget?.number}</strong>?
              Data akan hilang permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}