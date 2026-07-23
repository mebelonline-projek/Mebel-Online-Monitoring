"use client";

// ============================================================
// 🔍 TRANSACTION DETAIL — Detail transaksi lengkap
// ============================================================
// Menampilkan: info transaksi, HPP items, riwayat pembayaran, aksi.
// Owner: bisa void + hapus permanen. Karyawan: hanya lihat & edit.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { FulfillmentBadge } from "@/components/shared/fulfillment-badge";
import { FULFILLMENT_STATUSES } from "@/config/fulfillment";
import { invalidateTransactionRelatedCaches } from "@/lib/use-cached-list";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Pencil,
  Ban,
  Trash2,
  FileText,
  DollarSign,
  Plus,
  Package,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

interface TransactionDetail {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  payment_type: "CASH" | "DP";
  dp_amount: number;
  status: string;
  void_reason: string | null;
  created_by: string | null;
  void_by: string | null;
  created_at: string;
  updated_at: string;
  void_at: string | null;
  fulfillment_status?: string;
  hpp_items: Array<{ id: string; name: string; amount: number; note: string | null }>;
  transaction_payments: Array<{ id: string; amount: number; payment_date: string; method: string; note: string | null }>;
  transaction_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    note: string | null;
  }>;
}

interface Props {
  transaction: TransactionDetail;
  profileRole: string;
  userId: string;
}

export function TransactionDetailClient({ transaction, profileRole, userId }: Props) {
  const router = useRouter();
  const isOwner = profileRole === "OWNER";

  // ⚡ Optimistic: baca sessionStorage saat mount — render instan tanpa fetch ulang
  const [displayTransaction, setDisplayTransaction] = useState<TransactionDetail>(() => {
    try {
      const pending = sessionStorage.getItem("pending_trx");
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed.id === transaction.id) {
          sessionStorage.removeItem("pending_trx");
          return {
            ...transaction,
            ...parsed,
            hpp_items: transaction.hpp_items,
            transaction_payments: transaction.transaction_payments,
          };
        }
      }
    } catch {
      // sessionStorage tidak tersedia atau data corrupt — pakai data server
    }
    return transaction;
  });

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    transaction.fulfillment_status || "MENUNGGU"
  );
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);

  // Sync dari props setelah router.refresh() / navigasi dengan data baru (HPP, void, dll)
  useEffect(() => {
    setDisplayTransaction(transaction);
    setFulfillmentStatus(transaction.fulfillment_status || "MENUNGGU");
  }, [transaction]);

  const canEdit = displayTransaction.status === "DP";
  const canVoid = isOwner && displayTransaction.status !== "BATAL";
  const canDelete = isOwner;
  const canAddPayment = displayTransaction.status === "MENUNGGU_PELUNASAN" || displayTransaction.status === "DP";
  const totalPaid = displayTransaction.transaction_payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = displayTransaction.final_price - totalPaid;
  const totalHpp = displayTransaction.hpp_items.reduce((sum, item) => sum + item.amount, 0);
  const estimatedProfit = displayTransaction.final_price - totalHpp;

  const handleWhatsAppReminder = () => {
    const customer = displayTransaction.customer_name || "Pelanggan";
    const text = encodeURIComponent(
      `Halo ${customer}, reminder tagihan ${displayTransaction.transaction_number} sebesar ${formatCurrency(remainingAmount > 0 ? remainingAmount : displayTransaction.final_price)}. Terima kasih.`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleFulfillmentChange = async (status: string) => {
    setIsUpdatingFulfillment(true);
    try {
      const response = await fetch("/api/transactions/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: displayTransaction.id, fulfillment_status: status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui status");
      }
      setFulfillmentStatus(status);
      toast.success(result.message);
      invalidateTransactionRelatedCaches();
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsUpdatingFulfillment(false);
    }
  };

  const handleVoid = async () => {
    if (!voidReason || voidReason.trim().length < 3) {
      toast.error("Alasan pembatalan minimal 3 karakter");
      return;
    }
    setIsVoiding(true);
    try {
      const response = await fetch("/api/transactions/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: displayTransaction.id,
          reason: voidReason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal membatalkan transaksi");
      }

      toast.success(result.message);
      setVoidDialogOpen(false);
      invalidateTransactionRelatedCaches();
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal membatalkan transaksi");
    } finally {
      setIsVoiding(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions?id=${displayTransaction.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus transaksi");
      }

      toast.success(result.message);
      invalidateTransactionRelatedCaches();
      router.push("/transaksi");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold font-mono">
              {displayTransaction.transaction_number}
            </h1>
            <StatusBadge status={displayTransaction.status} />
            <FulfillmentBadge status={fulfillmentStatus} />
          </div>
          <p className="text-muted-foreground text-sm">
            Dibuat {formatDate(displayTransaction.created_at)}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.back()} className="gap-2 min-h-[44px] col-span-2 sm:col-span-1">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => router.push(`/transaksi/${displayTransaction.id}/edit`)}
              className="gap-2 min-h-[44px]"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          {canVoid && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2 min-h-[44px]"
              onClick={() => setVoidDialogOpen(true)}
            >
              <Ban className="w-4 h-4" />
              Batalkan
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2 min-h-[44px]"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push(`/transaksi/${displayTransaction.id}/invoice`)}
            className="gap-2 min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            Nota
          </Button>
          {canAddPayment && (
            <Button
              onClick={() => router.push(`/transaksi/${displayTransaction.id}/pelunasan`)}
              className="gap-2 min-h-[44px] col-span-2 sm:col-span-1"
            >
              <DollarSign className="w-4 h-4" />
              Input Pelunasan
            </Button>
          )}
          {remainingAmount > 0 && displayTransaction.status !== "BATAL" && (
            <Button
              variant="outline"
              onClick={handleWhatsAppReminder}
              className="gap-2 min-h-[44px] col-span-2 sm:col-span-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Info Transaksi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Info Transaksi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                    Pelanggan
                  </p>
                  <p className="font-semibold">{displayTransaction.customer_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                    Deskripsi
                  </p>
                  <p className="font-semibold">{displayTransaction.description || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                    Harga Jual
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(displayTransaction.final_price)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                    Tipe Pembayaran
                  </p>
                  <p className="font-semibold">
                    {displayTransaction.payment_type === "CASH" ? "💵 Cash" : "💳 DP (Uang Muka)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {displayTransaction.status !== "BATAL" && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Status Pesanan</h3>
                <div className="flex flex-wrap gap-2">
                  {FULFILLMENT_STATUSES.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={fulfillmentStatus === opt.value ? "default" : "outline"}
                      disabled={isUpdatingFulfillment}
                      onClick={() => handleFulfillmentChange(opt.value)}
                      className="min-h-[40px]"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(displayTransaction.transaction_items?.length ?? 0) > 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Item Pesanan</h3>
                <div className="space-y-2">
                  {displayTransaction.transaction_items!.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 rounded-lg bg-accent/30 border border-border"
                    >
                      <div>
                        <p className="font-semibold">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* HPP Items */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">
                  HPP Items
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Total: {formatCurrency(totalHpp)})
                  </span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/transaksi/${displayTransaction.id}/hpp`)}
                  className="gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kelola HPP
                </Button>
              </div>

              {displayTransaction.hpp_items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Belum ada item HPP</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tambahkan biaya HPP untuk melihat estimasi laba
                  </p>
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-2">
                    {displayTransaction.hpp_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start p-3 rounded-lg bg-accent/30 border border-border"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">{item.name}</p>
                          {item.note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                          )}
                        </div>
                        <p className="font-semibold shrink-0 ml-2">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Catatan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayTransaction.hpp_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold">{item.name}</TableCell>
                            <TableCell>{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.note || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {displayTransaction.hpp_items.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-accent/30 border border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimasi Laba Kotor:</span>
                    <span
                      className={`font-bold ${
                        estimatedProfit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(estimatedProfit)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Pembayaran & Status */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Ringkasan Pembayaran</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-bold">{formatCurrency(displayTransaction.final_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Dibayar</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold">Sisa Tagihan</span>
                  <span
                    className={`font-bold text-lg ${
                      remainingAmount <= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {remainingAmount <= 0 ? "✓ Lunas" : formatCurrency(remainingAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Riwayat Pembayaran</h3>
              {displayTransaction.transaction_payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <DollarSign className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">Belum ada pembayaran</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayTransaction.transaction_payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-accent/30 border border-border"
                    >
                      <div>
                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)} — {payment.method}
                        </p>
                        {payment.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{payment.note}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {payment.method === "TUNAI" ? "💵" : "🏦"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Void Info (if BATAL) */}
          {displayTransaction.status === "BATAL" && (
            <Card className="shadow-sm border-destructive/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-destructive mb-2">Transaksi Dibatalkan</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Alasan:</strong> {displayTransaction.void_reason || "—"}
                </p>
                {displayTransaction.void_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(displayTransaction.void_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Void Confirmation Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={(open) => { setVoidDialogOpen(open); if (!open) setVoidReason(""); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
            <DialogDescription>
              Yakin batalkan transaksi <strong className="text-foreground">{displayTransaction.transaction_number}</strong>?
              Data tetap tersimpan, hanya status berubah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Alasan Pembatalan <span className="text-destructive">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Tuliskan alasan pembatalan..."
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setVoidDialogOpen(false); setVoidReason(""); }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isVoiding || voidReason.trim().length < 3}
            >
              {isVoiding ? "Membatalkan..." : "Ya, Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[460px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Hapus Transaksi Permanen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus permanen{" "}
              <strong className="text-foreground">{displayTransaction.transaction_number}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-accent/30 rounded-lg p-3 text-sm">
            <p className="font-semibold mb-1">Data yang akan ikut terhapus:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>{displayTransaction.transaction_payments.length} pembayaran</li>
              <li>{displayTransaction.hpp_items.length} item HPP</li>
            </ul>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-destructive text-xs font-semibold">
              ⚠️ Tindakan ini TIDAK BISA DIURUNGKAN.
              {displayTransaction.status === "LUNAS" && " Transaksi LUNAS — data keuangan akan hilang!"}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}