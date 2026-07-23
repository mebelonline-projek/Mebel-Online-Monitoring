"use client";

// ============================================================
// 💰 PELUNASAN FORM CLIENT — Input pembayaran pelunasan
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { paymentSchema } from "@/lib/validation";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { invalidateTransactionRelatedCaches } from "@/lib/use-cached-list";

interface PaymentRecord {
  id: string;
  transaction_id: string;
  amount: number;
  payment_date: string;
  method: string;
  note: string | null;
  created_by: string;
}

interface Props {
  transactionId: string;
  invoiceNumber: string;
  finalPrice: number;
  totalPaid: number;
  remaining: number;
  customerName: string;
  existingPayments: PaymentRecord[];
}

export function PelunasanFormClient({
  transactionId,
  invoiceNumber,
  finalPrice,
  totalPaid,
  remaining,
  customerName,
  existingPayments,
}: Props) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [note, setNote] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickFillLunas = () => {
    setAmount(remaining.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      transaction_id: transactionId,
      amount: Number(amount),
      method,
      note: note || "",
    };

    const parsed = paymentSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    // Validasi tambahan: tidak melebihi sisa
    if (Number(amount) > remaining) {
      setFormErrors({
        amount: `Jumlah melebihi sisa tagihan (${formatCurrency(remaining)})`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses pembayaran");
      }

      toast.success(result.message);
      invalidateTransactionRelatedCaches();
      router.push(`/transaksi/${transactionId}`);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.back()}
          className="btn-dark text-sm cursor-pointer"
        >
          ← Kembali
        </button>
        <h1 className="text-2xl md:text-3xl font-bold font-mono">
          {invoiceNumber}
        </h1>
      </div>

      {/* Ringkasan */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Ringkasan Tagihan</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pelanggan</span>
            <span className="font-semibold">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Tagihan</span>
            <span className="font-bold">{formatCurrency(finalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sudah Dibayar</span>
            <span className="font-bold text-secondary">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-semibold">Sisa Tagihan</span>
            <span className="font-bold text-lg text-warning">
              {remaining <= 0 ? "✓ Lunas" : formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Riwayat Pembayaran Sebelumnya */}
      {existingPayments.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold mb-3">Pembayaran Sebelumnya</h3>
          <div className="space-y-2">
            {existingPayments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 bg-accent/20 rounded-lg"
              >
                <div>
                  <p className="font-semibold">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.payment_date)} — {p.method}
                  </p>
                  {p.note && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.note}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {p.method === "TUNAI" ? "💵" : "🏦"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Pembayaran */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4">Pembayaran Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Jumlah */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Jumlah Pembayaran <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={handleQuickFillLunas}
                className="text-primary text-xs hover:underline bg-transparent border-none cursor-pointer"
              >
                Bayar Lunas ({formatCurrency(remaining)})
              </button>
            </div>
            <CurrencyInput
              value={amount}
              onChange={(val) => setAmount(val)}
              className={formErrors.amount ? "border-destructive" : ""}
              placeholder="1.000.000"
            />
            {formErrors.amount && (
              <p className="text-destructive text-xs mt-1">{formErrors.amount}</p>
            )}
            {amount && !formErrors.amount && (
              <p className="text-muted-foreground text-xs mt-1">
                Sisa setelah pembayaran:{" "}
                {formatCurrency(remaining - Number(amount))}
              </p>
            )}
          </div>

          {/* Metode */}
          <div>
            <label className="block text-muted-foreground text-xs font-semibold mb-1.5 uppercase tracking-wider">
              Metode Pembayaran <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMethod("TUNAI")}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                  method === "TUNAI"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                💵 Tunai
              </button>
              <button
                type="button"
                onClick={() => setMethod("TRANSFER")}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                  method === "TRANSFER"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                🏦 Transfer
              </button>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-muted-foreground text-xs font-semibold mb-1.5 uppercase tracking-wider">
              Catatan
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="dark-input w-full"
              placeholder="Catatan opsional..."
            />
            {formErrors.note && (
              <p className="text-destructive text-xs mt-1">{formErrors.note}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-dark px-6 py-2.5 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || Number(amount) < 1}
              className="btn-maroon px-6 py-2.5 cursor-pointer"
            >
              {isSubmitting ? "⏳ Memproses..." : "💰 Bayar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}