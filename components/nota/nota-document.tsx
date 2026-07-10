"use client";

// ============================================================
// 🧾 NOTA / RECEIPT DOCUMENT — Preview Nota dengan Logo Toko
// ============================================================

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { StoreLogo } from "@/components/shared/store-logo";
import { toast } from "sonner";
import type { InvoiceLineItem } from "@/components/invoice/invoice-document";

interface PaymentItem {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  note: string | null;
}

interface NotaProps {
  transaction_number: string;
  customer_name: string;
  lineItems: InvoiceLineItem[];
  final_price: number;
  payment_type: string;
  dp_amount: number;
  status: string;
  created_at: string;
  payments: PaymentItem[];
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  logo_url?: string;
}

export function NotaDocument({
  transaction_number,
  customer_name,
  lineItems,
  final_price,
  payment_type,
  dp_amount,
  status,
  created_at,
  payments,
  store_name = "Mebel Online Monitoring",
  store_address = "",
  store_phone = "",
  logo_url,
  transaction_id,
}: NotaProps & { transaction_id?: string }) {
  const router = useRouter();
  const [savingPdf, setSavingPdf] = useState(false);

  const handleSavePdf = async () => {
    if (!transaction_id) {
      toast.error("ID transaksi tidak tersedia");
      return;
    }
    setSavingPdf(true);
    try {
      const res = await fetch(`/api/nota/${transaction_id}`);
      if (!res.ok) throw new Error("Gagal mengambil PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NOTA-${transaction_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Nota berhasil disimpan sebagai PDF");
    } catch {
      toast.error("Gagal menyimpan nota sebagai PDF");
    } finally {
      setSavingPdf(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = final_price - totalPaid;
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  return (
    <div className="bg-background text-foreground">
      <div className="flex flex-wrap gap-3 mb-6 justify-end">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Button>
        <Button size="sm" onClick={() => window.print()} className="gap-1">
          <Printer className="w-3.5 h-3.5" />
          Cetak Nota
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSavePdf}
          disabled={savingPdf}
          className="gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          {savingPdf ? "Menyimpan..." : "Simpan PDF"}
        </Button>
      </div>

      <div
        className="max-w-[500px] mx-auto bg-white text-black border border-border rounded-xl shadow-sm p-6 sm:p-8"
        id="nota-print-area"
      >
        {/* Header */}
        <div className="text-center mb-5 border-b border-dashed border-gray-300 pb-4">
          <div className="flex items-center justify-center mb-2">
            <StoreLogo src={logo_url} alt={store_name} size="sm" variant="print" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{store_name}</h2>
          {store_address && <p className="text-xs text-gray-500 mt-0.5">{store_address}</p>}
          {store_phone && <p className="text-xs text-gray-500">Telp: {store_phone}</p>}
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-black tracking-widest uppercase">Nota Pembayaran</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono">{transaction_number}</p>
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="text-gray-500 py-1 w-24">Tanggal</td>
              <td className="py-1">: {formatDate(created_at)}</td>
            </tr>
            <tr>
              <td className="text-gray-500 py-1">Pelanggan</td>
              <td className="py-1 font-semibold">: {customer_name}</td>
            </tr>
            <tr>
              <td className="text-gray-500 py-1">Tipe</td>
              <td className="py-1">
                : {payment_type === "CASH" ? "Cash (Lunas)" : "DP / Uang Muka"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-300 my-4" />

        {/* Daftar Produk */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Rincian Produk
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left">
                <th className="py-1.5 pr-2 font-semibold">Produk</th>
                <th className="py-1.5 px-1 font-semibold text-center w-10">Qty</th>
                <th className="py-1.5 px-1 font-semibold text-right w-20">Harga</th>
                <th className="py-1.5 pl-1 font-semibold text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={`${item.product_name}-${index}`} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-2">
                    <span className="font-medium text-gray-900">{item.product_name}</span>
                    {item.note && (
                      <span className="block text-[10px] text-gray-400 mt-0.5">{item.note}</span>
                    )}
                  </td>
                  <td className="py-2 px-1 text-center font-medium">{item.quantity}</td>
                  <td className="py-2 px-1 text-right text-gray-600 whitespace-nowrap">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-2 pl-1 text-right font-semibold whitespace-nowrap">
                    {formatCurrency(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300">
                <td colSpan={3} className="py-2 text-right font-semibold text-gray-600">
                  Total ({lineItems.length} item)
                </td>
                <td className="py-2 text-right font-bold text-base">
                  {formatCurrency(itemsSubtotal || final_price)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="border-t border-dashed border-gray-300 my-4" />

        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 text-gray-600">Total Tagihan</td>
              <td className="py-2 text-right font-bold">{formatCurrency(final_price)}</td>
            </tr>
            {payment_type === "DP" && (
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">DP Awal</td>
                <td className="py-2 text-right">{formatCurrency(dp_amount)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 text-gray-600">Total Dibayar</td>
              <td className="py-2 text-right font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </td>
            </tr>
            {remaining > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Sisa Tagihan</td>
                <td className="py-2 text-right font-bold text-red-600">
                  {formatCurrency(remaining)}
                </td>
              </tr>
            )}
            {remaining <= 0 && payment_type !== "CASH" && (
              <tr>
                <td className="py-2 text-green-700 font-bold" colSpan={2}>
                  ✓ LUNAS
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {payments.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-300 my-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Riwayat Pembayaran
            </h4>
            {payments.map((p) => (
              <div key={p.id} className="text-xs flex justify-between py-1 border-b border-gray-100">
                <span>
                  {formatDate(p.payment_date)} — {p.method}
                </span>
                <span className="font-bold">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </>
        )}

        <div className="border-t border-dashed border-gray-300 mt-6 pt-4 text-center text-xs text-gray-400">
          <p>Terima kasih atas kepercayaan Anda!</p>
          <p className="mt-1 text-[10px]">{status}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #nota-print-area,
          #nota-print-area * {
            visibility: visible;
          }
          #nota-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            border: none;
            box-shadow: none;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
