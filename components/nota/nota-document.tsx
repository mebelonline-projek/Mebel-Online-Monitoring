"use client";

// ============================================================
// 🧾 NOTA / RECEIPT DOCUMENT — Preview Nota dengan Logo Toko
// ============================================================

import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

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
  product_name: string;
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
  product_name,
  final_price,
  payment_type,
  dp_amount,
  status,
  created_at,
  payments,
  store_name = "Mebel Online Monitoring",
  store_address = "",
  store_phone = "",
  logo_url = "/logo.webp",
}: NotaProps) {
  const router = useRouter();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = final_price - totalPaid;

  return (
    <div className="bg-background text-foreground">
      <div className="flex gap-3 mb-6 justify-end">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Button>
        <Button size="sm" onClick={() => window.print()} className="gap-1">
          <Printer className="w-3.5 h-3.5" />
          Cetak Nota
        </Button>
      </div>

      <div className="max-w-[500px] mx-auto bg-white text-black border border-border rounded-xl shadow-sm p-8" id="nota-print-area">
        {/* Header dengan Logo */}
        <div className="text-center mb-6 border-b border-dashed border-gray-300 pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo_url} alt="Logo" className="w-full h-full object-contain p-1"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.webp"; }} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{store_name}</h2>
          {store_address && <p className="text-xs text-gray-500 mt-0.5">{store_address}</p>}
          {store_phone && <p className="text-xs text-gray-500">Telp: {store_phone}</p>}
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-black tracking-widest uppercase">Nota Pembayaran</h1>
          <p className="text-xs text-gray-500 mt-1">{transaction_number}</p>
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr><td className="text-gray-500 py-1 w-24">Tanggal</td><td className="py-1">: {formatDate(created_at)}</td></tr>
            <tr><td className="text-gray-500 py-1">Pelanggan</td><td className="py-1 font-semibold">: {customer_name}</td></tr>
            <tr><td className="text-gray-500 py-1">Produk</td><td className="py-1">: {product_name}</td></tr>
            <tr><td className="text-gray-500 py-1">Tipe</td><td className="py-1">: {payment_type === "CASH" ? "Cash (Lunas)" : "DP / Uang Muka"}</td></tr>
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-300 my-4" />

        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-600">Harga</td><td className="py-2 text-right font-bold">{formatCurrency(final_price)}</td></tr>
            {payment_type === "DP" && <tr className="border-b border-gray-200"><td className="py-2 text-gray-600">DP Awal</td><td className="py-2 text-right">{formatCurrency(dp_amount)}</td></tr>}
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-600">Total Dibayar</td><td className="py-2 text-right font-bold text-green-700">{formatCurrency(totalPaid)}</td></tr>
            {remaining > 0 && <tr className="border-b border-gray-200"><td className="py-2 text-gray-600">Sisa Tagihan</td><td className="py-2 text-right font-bold text-red-600">{formatCurrency(remaining)}</td></tr>}
            {remaining <= 0 && payment_type !== "CASH" && <tr><td className="py-2 text-green-700 font-bold" colSpan={2}>✓ LUNAS</td></tr>}
          </tbody>
        </table>

        {payments.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-300 my-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Riwayat Pembayaran</h4>
            {payments.map((p) => (
              <div key={p.id} className="text-xs flex justify-between py-1 border-b border-gray-100">
                <span>{formatDate(p.payment_date)} — {p.method}</span>
                <span className="font-bold">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </>
        )}

        <div className="border-t border-dashed border-gray-300 mt-6 pt-4 text-center text-xs text-gray-400">
          <p>Terima kasih atas kepercayaan Anda!</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #nota-print-area, #nota-print-area * { visibility: visible; }
          #nota-print-area { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; border: none; box-shadow: none; padding: 20px; }
        }
      `}</style>
    </div>
  );
}