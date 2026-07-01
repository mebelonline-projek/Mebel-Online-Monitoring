"use client";

// ============================================================
// 🧾 INVOICE DETAIL — Profesional Invoice dengan PDF Download
// ============================================================
// Desain profesional: logo toko, tabel, riwayat pembayaran, download PDF.
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { ArrowLeft, Trash2, Download, Printer } from "lucide-react";

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  total_paid: number;
  remaining_amount: number;
  notes: string | null;
  created_at: string;
  invoice_items?: Array<{
    id: string;
    transaction_id: string;
    transactions?: {
      id: string;
      transaction_number: string;
      final_price: number;
      status: string;
      payment_type: string;
      dp_amount: number;
    } | null;
    payments?: Array<{ id: string; amount: number; payment_date: string; method: string; note: string | null }>;
  }>;
}

interface StoreSettings {
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface Props {
  invoice: InvoiceDetail;
  profileRole: string;
  storeSettings: StoreSettings | null;
}

export function InvoiceDetailClient({ invoice, profileRole, storeSettings }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isOwner = profileRole === "OWNER";
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const logoUrl = storeSettings?.logo_url || "/logo.webp";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (error) throw error;
      toast.success(`Invoice ${invoice.invoice_number} berhasil dihapus`);
      router.push("/invoice");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus invoice");
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/invoice/${invoice.id}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const allTransactions =
    invoice.invoice_items?.map((item) => item.transactions).filter(Boolean) || [];
  const totalPaid = invoice.total_paid;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold font-mono">
              {invoice.invoice_number}
            </h1>
            <Badge
              className={
                invoice.status === "PAID"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : invoice.status === "DRAFT"
                    ? "bg-muted text-muted-foreground"
                    : invoice.status === "SENT"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
              }
            >
              {invoice.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Preview Invoice</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/invoice")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowDelete(true)}
              aria-label="Hapus invoice"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Unduh PDF</span>
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </Button>
        </div>
      </div>

      {/* INVOICE PREVIEW CARD — kept as physical invoice style */}
      <Card className="overflow-hidden shadow-sm">
        <div className="bg-white text-black p-4 md:p-8 lg:p-12 dark:bg-white dark:text-black" id="invoice-print-area">
          {/* HEADER */}
          <div className="flex flex-row justify-between items-start mb-8 pb-6 border-b-2 border-[#800000]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.webp";
                  }}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#800000]">
                  {storeSettings?.store_name || "Mebel Online Monitoring"}
                </h2>
                {storeSettings?.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{storeSettings.address}</p>
                )}
                {storeSettings?.phone && (
                  <p className="text-xs text-gray-500">Telp: {storeSettings.phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-[#800000]">INVOICE</h3>
              <p className="text-sm font-bold text-gray-800 mt-1">{invoice.invoice_number}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          {/* CUSTOMER INFO */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-[#800000] mb-2 pb-1 border-b border-gray-200">
              Data Pelanggan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
              <div className="flex">
                <span className="text-gray-500 w-20">Nama</span>
                <span className="font-medium">{invoice.customer_name || "—"}</span>
              </div>
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-[#800000] mb-2 pb-1 border-b border-gray-200">
              Detail Pesanan
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#800000] hover:bg-[#800000] [&>th]:text-white [&>th]:border-white/20">
                    <TableHead className="text-left font-medium">No. Transaksi</TableHead>
                    <TableHead className="text-center font-medium">Tipe</TableHead>
                    <TableHead className="text-right font-medium">Harga</TableHead>
                    <TableHead className="text-right font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTransactions.map((tx: any) => (
                    <TableRow key={tx.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">{tx.transaction_number}</TableCell>
                      <TableCell className="text-center text-xs">
                        {tx.payment_type === "CASH" ? "Cash" : "DP"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.final_price)}</TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="ml-auto w-full md:w-1/2 mb-6">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Total Pesanan</span>
              <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Total Dibayar</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between py-2 mt-2 text-base font-bold border-t-2 border-[#800000] bg-gray-50 px-2 rounded">
              <span>Sisa Tagihan</span>
              <span
                className={
                  invoice.remaining_amount <= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {invoice.remaining_amount <= 0
                  ? "✓ LUNAS"
                  : formatCurrency(invoice.remaining_amount)}
              </span>
            </div>
          </div>

          {invoice.notes && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#800000] mb-2 pb-1 border-b border-gray-200">
                Catatan
              </h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Terima kasih atas kepercayaan Anda</p>
            <p className="mt-1">
              {storeSettings?.store_name || "Mebel Online Monitoring"}
              {storeSettings?.address ? ` — ${storeSettings.address}` : ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; border: none; box-shadow: none; padding: 20px; }
        }
      `}</style>

      {/* Delete Alert */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Hapus Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus <strong className="text-foreground">{invoice.invoice_number}</strong>?
              Data akan hilang permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}