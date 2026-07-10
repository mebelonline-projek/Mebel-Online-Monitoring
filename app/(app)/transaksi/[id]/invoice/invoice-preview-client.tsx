// ============================================================
// 🧾 INVOICE PREVIEW CLIENT — Preview & Download Invoice
// ============================================================

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cacheNotaHtml, getCachedNotaHtml } from "@/lib/nota-cache";
import { mapTransactionLineItems } from "@/lib/pdf-invoice";
import { StatusBadge } from "@/components/shared/status-badge";
import { StoreLogo } from "@/components/shared/store-logo";

interface TransactionData {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  payment_type: "CASH" | "DP";
  dp_amount: number;
  status: string;
  created_at: string;
  transaction_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    note: string | null;
    sort_order: number;
  }>;
  transaction_payments: Array<{ id: string; amount: number; payment_date: string; method: string; note: string | null }>;
}

interface SettingsData {
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface Props {
  transaction: TransactionData;
  settings: SettingsData | null;
  profileRole: string;
}

export function InvoicePreviewClient({ transaction, settings, profileRole }: Props) {
  const router = useRouter();
  const notaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notaRef.current) {
      cacheNotaHtml(transaction.id, notaRef.current.innerHTML);
    }
  }, [transaction]);

  useEffect(() => {
    if (!navigator.onLine) {
      getCachedNotaHtml(transaction.id).then((html) => {
        if (html && notaRef.current) {
          notaRef.current.innerHTML = html;
        }
      });
    }
  }, [transaction.id]);

  const totalPaid = transaction.transaction_payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = transaction.final_price - totalPaid;
  const lineItems = mapTransactionLineItems(transaction.transaction_items, {
    description: transaction.description,
    final_price: transaction.final_price,
  });
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  // ============================================================
  // Download PDF
  // ============================================================
  const handleDownload = () => {
    // Buka PDF di tab baru — browser akan download atau tampilkan
    window.open(`/api/invoice/${transaction.id}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold font-mono">
              {transaction.transaction_number}
            </h1>
            <StatusBadge status={transaction.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Preview Invoice
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="btn-dark text-sm cursor-pointer"
          >
            ← Kembali
          </button>
          <button
            onClick={handleDownload}
            className="btn-maroon text-sm cursor-pointer"
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      {/* ==================== PREVIEW CARD ==================== */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Inner white card simulates paper */}
        <div ref={notaRef} className="bg-white text-black p-8 md:p-12 lg:p-16">
          {/* HEADER */}
          <div className="flex flex-row justify-between items-start mb-8 pb-6 border-b-2 border-[#800000]">
            <div className="flex items-center gap-4">
              <StoreLogo
                src={settings?.logo_url}
                alt={settings?.store_name || "Logo toko"}
                size="lg"
                variant="print"
              />
              <div>
                <h2 className="text-xl font-bold text-[#800000]">
                  {settings?.store_name || "Mebel Online Monitoring"}
                </h2>
                {settings?.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{settings.address}</p>
                )}
                {settings?.phone && (
                  <p className="text-xs text-gray-500">Telp: {settings.phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-[#800000]">INVOICE</h3>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {transaction.transaction_number}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(transaction.created_at)}
              </p>
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
                <span className="font-medium">{transaction.customer_name || "—"}</span>
              </div>
            </div>
          </div>

          {/* DETAIL PESANAN */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-[#800000] mb-2 pb-1 border-b border-gray-200">
              Rincian Produk
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#800000] text-white">
                  <th className="text-left p-2 font-medium">Produk</th>
                  <th className="text-center p-2 font-medium w-16">Qty</th>
                  <th className="text-right p-2 font-medium w-28">Harga</th>
                  <th className="text-right p-2 font-medium w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.product_name}-${index}`} className="border-b border-gray-200 align-top">
                    <td className="p-2">
                      <span className="font-medium">{item.product_name}</span>
                      {item.note && (
                        <span className="block text-xs text-gray-400 mt-0.5">{item.note}</span>
                      )}
                    </td>
                    <td className="text-center p-2">{item.quantity}</td>
                    <td className="text-right p-2">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right p-2 font-medium">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="p-2 text-right font-semibold text-gray-600">
                    Total ({lineItems.length} item)
                  </td>
                  <td className="p-2 text-right font-bold">
                    {formatCurrency(itemsSubtotal || transaction.final_price)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* SUMMARY */}
          <div className="ml-auto w-full md:w-1/2 mb-6">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Total Pesanan</span>
              <span className="font-medium">{formatCurrency(transaction.final_price)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Total Dibayar</span>
              <span className="font-medium text-green-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Metode</span>
              <span className="font-medium">
                {transaction.payment_type === "CASH" ? "Cash" : "DP (Uang Muka)"}
              </span>
            </div>
            <div className="flex justify-between py-2 mt-2 text-base font-bold border-t-2 border-[#800000] bg-gray-50 px-2 rounded">
              <span>Sisa Tagihan</span>
              <span className={remainingAmount <= 0 ? "text-green-600" : "text-red-600"}>
                {remainingAmount <= 0 ? "✓ LUNAS" : formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          {/* PAYMENT HISTORY */}
          {transaction.transaction_payments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#800000] mb-2 pb-1 border-b border-gray-200">
                Riwayat Pembayaran
              </h4>
              {transaction.transaction_payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between py-1.5 text-sm border-b border-gray-100"
                >
                  <span className="text-gray-500">
                    {formatDate(payment.payment_date)} — {payment.method}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Terima kasih atas kepercayaan Anda</p>
            <p className="mt-1">
              {settings?.store_name || "Mebel Online Monitoring"}
              {settings?.address && ` — ${settings.address}`}
            </p>
          </div>
        </div>
      </div>

      {/* Download button at bottom */}
      <div className="flex justify-center">
        <button
          onClick={handleDownload}
          className="btn-maroon cursor-pointer"
        >
          📥 Download PDF
        </button>
      </div>
    </div>
  );
}