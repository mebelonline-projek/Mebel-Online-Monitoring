"use client";

// ============================================================
// 📝 TRANSACTION FORM — Create & Edit
// ============================================================
// Reusable form untuk tambah & edit transaksi.
// Mendukung: input nama pelanggan, deskripsi, CASH / DP.
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ArrowLeft } from "lucide-react";

interface Props {
  initialData?: Partial<{
    customer_name: string;
    description: string;
    final_price: number;
    payment_type: "CASH" | "DP";
    dp_amount: number;
  }>;
  transactionId?: string;
  isEdit?: boolean;
}

type FormState = {
  customer_name: string;
  description: string;
  final_price: string;
  payment_type: "CASH" | "DP";
  dp_amount: string;
};

export function TransactionForm({ initialData, transactionId, isEdit }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    customer_name: initialData?.customer_name || "",
    description: initialData?.description || "",
    final_price: initialData?.final_price?.toString() || "",
    payment_type: initialData?.payment_type || "CASH",
    dp_amount: initialData?.dp_amount?.toString() || "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const finalPriceNum = Number(form.final_price);
    const dpAmountNum = Number(form.dp_amount) || 0;

    if (!form.final_price || finalPriceNum < 1) {
      setFormErrors({ final_price: "Harga harus lebih dari 0" });
      return;
    }
    if (form.payment_type === "DP") {
      if (!form.dp_amount || dpAmountNum < 1) {
        setFormErrors({ dp_amount: "DP harus lebih dari 0" });
        return;
      }
      if (dpAmountNum >= finalPriceNum) {
        setFormErrors({ dp_amount: "DP harus kurang dari harga final" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: form.customer_name || null,
        description: form.description || null,
        final_price: finalPriceNum,
        payment_type: form.payment_type,
        dp_amount: form.payment_type === "DP" ? dpAmountNum : 0,
      };

      if (isEdit && transactionId) {
        const response = await fetch("/api/transactions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: transactionId, ...payload }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mengupdate transaksi");
        }

        toast.success(result.message);
        router.push(`/transaksi/${transactionId}`);
      } else {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal menyimpan transaksi");
        }

        toast.success(result.message);
        router.push(`/transaksi/${result.data.id}`);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDp = form.payment_type === "DP";

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Pelanggan</label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Nama pelanggan (opsional)"
                  className={formErrors.customer_name ? "border-destructive" : ""}
                />
                {formErrors.customer_name && (
                  <p className="text-destructive text-xs">{formErrors.customer_name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi transaksi (opsional)"
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>

              {/* Final Price */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Harga Jual <span className="text-destructive">*</span>
                </label>
                <CurrencyInput
                  value={form.final_price}
                  onChange={(val) => setForm({ ...form, final_price: val })}
                  placeholder="1.000.000"
                  className={formErrors.final_price ? "border-destructive" : ""}
                />
                {formErrors.final_price && (
                  <p className="text-destructive text-xs">{formErrors.final_price}</p>
                )}
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tipe Pembayaran <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={form.payment_type === "CASH" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setForm({ ...form, payment_type: "CASH", dp_amount: "" })}
                  >
                    💵 Cash (Lunas)
                  </Button>
                  <Button
                    type="button"
                    variant={form.payment_type === "DP" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setForm({ ...form, payment_type: "DP" })}
                  >
                    💰 DP (Uang Muka)
                  </Button>
                </div>
              </div>

              {/* DP Amount */}
              {isDp && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Jumlah DP <span className="text-destructive">*</span>
                  </label>
                  <CurrencyInput
                    value={form.dp_amount}
                    onChange={(val) => setForm({ ...form, dp_amount: val })}
                    placeholder={`Min Rp 1, maks ${formatCurrency(Number(form.final_price) - 1 || 0)}`}
                    className={formErrors.dp_amount ? "border-destructive" : ""}
                  />
                  {formErrors.dp_amount && (
                    <p className="text-destructive text-xs">{formErrors.dp_amount}</p>
                  )}
                  {form.final_price && form.dp_amount && !formErrors.dp_amount && (
                    <p className="text-muted-foreground text-xs">
                      Sisa tagihan: {formatCurrency(Number(form.final_price) - Number(form.dp_amount))}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEdit ? "Simpan Perubahan" : "Buat Transaksi"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}