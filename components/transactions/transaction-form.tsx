"use client";

// ============================================================
// 📝 TRANSACTION FORM — Create & Edit
// ============================================================
// Reusable form untuk tambah & edit transaksi.
// Mendukung: input nama pelanggan, deskripsi, CASH / DP.
// ============================================================

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { transactionSchema, transactionCreateSchema } from "@/lib/validation";
import {
  LineItemsEditor,
  createDefaultLineItems,
  lineItemsTotal,
  type LineItem,
} from "@/components/transactions/line-items-editor";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ArrowLeft } from "lucide-react";
import { SearchablePicker } from "@/components/shared/searchable-picker";
import type { CustomerRow } from "@/lib/customers";
import type { ProductRow } from "@/lib/products";

function formatApiErrors(errors?: Record<string, string[] | undefined>): string | undefined {
  if (!errors) return undefined;
  const messages = Object.values(errors).flat().filter(Boolean);
  return messages.length > 0 ? messages.join(", ") : undefined;
}

interface Props {
  initialData?: Partial<{
    customer_id: string;
    product_id: string;
    customer_name: string;
    description: string;
    final_price: number;
    payment_type: "CASH" | "DP";
    dp_amount: number;
  }>;
  transactionId?: string;
  isEdit?: boolean;
  quickSale?: boolean;
  customers?: CustomerRow[];
  products?: ProductRow[];
}

type FormState = {
  customer_id: string | null;
  product_id: string | null;
  customer_name: string;
  description: string;
  final_price: string;
  payment_type: "CASH" | "DP";
  payment_method: "TUNAI" | "TRANSFER";
  dp_amount: string;
};

export function TransactionForm({
  initialData,
  transactionId,
  isEdit,
  quickSale = false,
  customers = [],
  products = [],
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<FormState>({
    customer_id: initialData?.customer_id || null,
    product_id: initialData?.product_id || null,
    customer_name: initialData?.customer_name || "",
    description: initialData?.description || "",
    final_price: initialData?.final_price?.toString() || "",
    payment_type: initialData?.payment_type || "CASH",
    payment_method: "TUNAI",
    dp_amount: initialData?.dp_amount?.toString() || "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(createDefaultLineItems);
  const useLineItems = quickSale && !isEdit;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      router.back();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const itemsPayload = useLineItems
      ? lineItems
          .filter((i) => i.product_name.trim() && (Number(i.unit_price) || 0) > 0)
          .map((i) => ({
            product_id: i.product_id || "",
            product_name: i.product_name.trim(),
            quantity: i.quantity,
            unit_price: Number(i.unit_price) || 0,
            note: i.note || "",
          }))
      : undefined;

    const computedTotal = useLineItems ? lineItemsTotal(lineItems) : Number(form.final_price);

    const schemaData = {
      customer_id: form.customer_id || "",
      product_id: form.product_id || "",
      customer_name: form.customer_name || "",
      description: form.description || "",
      final_price: computedTotal,
      payment_type: form.payment_type,
      payment_method: form.payment_method,
      dp_amount: form.payment_type === "DP" ? form.dp_amount : 0,
      items: itemsPayload && itemsPayload.length > 0 ? itemsPayload : undefined,
    };

    const parsed = useLineItems
      ? transactionCreateSchema.safeParse(schemaData)
      : transactionSchema.safeParse(schemaData);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        errors[field] = issue.message;
      });
      setFormErrors(errors);
      if (useLineItems && computedTotal < 1) {
        toast.error("Tambahkan minimal 1 produk dengan harga");
      } else {
        const firstIssue = parsed.error.issues[0]?.message;
        toast.error(firstIssue || "Periksa kembali isian form");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: parsed.data.customer_id || undefined,
        product_id: parsed.data.product_id || undefined,
        customer_name: parsed.data.customer_name ?? "",
        description: parsed.data.description ?? "",
        final_price: parsed.data.final_price,
        payment_type: parsed.data.payment_type,
        payment_method: parsed.data.payment_method,
        dp_amount: parsed.data.payment_type === "DP" ? parsed.data.dp_amount : 0,
        items: "items" in parsed.data ? parsed.data.items : undefined,
      } as {
        customer_id?: string;
        product_id?: string;
        customer_name: string;
        description: string;
        final_price: number;
        payment_type: "CASH" | "DP";
        payment_method: "TUNAI" | "TRANSFER";
        dp_amount: number;
        items?: Array<{
          product_id?: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          note?: string;
        }>;
      };

      if (isEdit && transactionId) {
        const response = await fetch("/api/transactions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: transactionId, ...payload }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const detail = formatApiErrors(result.errors);
          throw new Error(detail || result.message || "Gagal mengupdate transaksi");
        }

        toast.success(result.message);
        router.push(`/transaksi/${transactionId}`);
      } else {
        if (!navigator.onLine) {
          const { queueOfflineTransaction } = await import("@/lib/offline-sync");
          await queueOfflineTransaction({
            ...payload,
            items: payload.items,
          });
          toast.success("Transaksi disimpan offline — akan disinkronkan saat online", {
            duration: 6000,
          });
          setForm({
            customer_id: null,
            product_id: null,
            customer_name: "",
            description: "",
            final_price: "",
            payment_type: "CASH",
            payment_method: "TUNAI",
            dp_amount: "",
          });
          setLineItems(createDefaultLineItems());
          return;
        }

        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const detail = formatApiErrors(result.errors);
          throw new Error(detail || result.message || "Gagal menyimpan transaksi");
        }

        const txId = result.data.id;
        toast.success(result.message, {
          action: {
            label: "Cetak Nota",
            onClick: () => router.push(`/transaksi/${txId}/invoice`),
          },
          duration: 8000,
        });

        // ⚡ Optimistic: simpan data ke sessionStorage agar halaman detail render instan
        try {
          sessionStorage.setItem(
            "pending_trx",
            JSON.stringify({
              id: result.data.id,
              transaction_number: result.data.transaction_number,
              customer_name: payload.customer_name,
              description: payload.description,
              final_price: payload.final_price,
              payment_type: payload.payment_type,
              dp_amount: payload.dp_amount,
              status: payload.payment_type === "CASH" ? "LUNAS" : "DP",
              created_at: new Date().toISOString(),
            })
          );
        } catch {
          // sessionStorage tidak tersedia — fallback normal (halaman detail fetch dari DB)
        }

        router.push(`/transaksi/${result.data.id}`);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDp = form.payment_type === "DP";
  const finalPriceNum = useLineItems ? lineItemsTotal(lineItems) : Number(form.final_price) || 0;
  const dpAmountNum = Number(form.dp_amount) || 0;
  const remaining = isDp ? finalPriceNum - dpAmountNum : 0;

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.phone || c.address || undefined,
  }));

  const productOptions = products.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: `${p.category} — ${formatCurrency(p.base_price)}`,
  }));

  const formFields = (
    <div className="space-y-6">
      <SearchablePicker
        label="Pelanggan"
        placeholder="Cari pelanggan..."
        options={customerOptions}
        value={form.customer_id}
        onChange={(id, opt) => {
          setForm({
            ...form,
            customer_id: id,
            customer_name: opt?.label || form.customer_name,
          });
        }}
        manualValue={form.customer_name}
        onManualChange={(v) => setForm({ ...form, customer_name: v, customer_id: null })}
        manualPlaceholder="Atau ketik nama pelanggan baru..."
      />

      {useLineItems ? (
        <LineItemsEditor
          items={lineItems}
          onChange={setLineItems}
          products={products}
        />
      ) : (
        <>
          <SearchablePicker
            label="Produk"
            placeholder="Cari produk..."
            options={productOptions}
            value={form.product_id}
            onChange={(id, opt) => {
              const product = products.find((p) => p.id === id);
              setForm({
                ...form,
                product_id: id,
                description: product?.description || product?.name || form.description,
                final_price: product?.base_price ? product.base_price.toString() : form.final_price,
              });
            }}
            manualValue={form.description}
            onManualChange={(v) => setForm({ ...form, description: v, product_id: null })}
            manualPlaceholder="Atau ketik deskripsi produk..."
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Harga Jual <span className="text-destructive">*</span>
            </label>
            <CurrencyInput
              value={form.final_price}
              onChange={(val) => setForm({ ...form, final_price: val })}
              placeholder="1.000.000"
              autoFocus={!isEdit}
              className={`${quickSale ? "text-lg h-12" : ""} ${formErrors.final_price ? "border-destructive" : ""}`}
            />
            {formErrors.final_price && (
              <p className="text-destructive text-xs">{formErrors.final_price}</p>
            )}
          </div>
        </>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Tipe Pembayaran <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={form.payment_type === "CASH" ? "default" : "outline"}
            className={`flex-1 ${quickSale ? "h-12 text-base" : ""}`}
            onClick={() => setForm({ ...form, payment_type: "CASH", dp_amount: "" })}
          >
            Cash (Lunas)
          </Button>
          <Button
            type="button"
            variant={form.payment_type === "DP" ? "default" : "outline"}
            className={`flex-1 ${quickSale ? "h-12 text-base" : ""}`}
            onClick={() => setForm({ ...form, payment_type: "DP" })}
          >
            DP (Uang Muka)
          </Button>
        </div>
      </div>

      {isDp && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Jumlah DP <span className="text-destructive">*</span>
          </label>
          <CurrencyInput
            value={form.dp_amount}
            onChange={(val) => setForm({ ...form, dp_amount: val })}
            placeholder={`Min Rp 1, maks ${formatCurrency(Number(form.final_price) - 1 || 0)}`}
            className={`${quickSale ? "text-lg h-12" : ""} ${formErrors.dp_amount ? "border-destructive" : ""}`}
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

      <div className="space-y-2">
        <label className="text-sm font-medium">Metode Pembayaran</label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={form.payment_method === "TUNAI" ? "default" : "outline"}
            className={`flex-1 ${quickSale ? "h-12" : "min-h-[44px]"}`}
            onClick={() => setForm({ ...form, payment_method: "TUNAI" })}
          >
            Tunai
          </Button>
          <Button
            type="button"
            variant={form.payment_method === "TRANSFER" ? "default" : "outline"}
            className={`flex-1 ${quickSale ? "h-12" : "min-h-[44px]"}`}
            onClick={() => setForm({ ...form, payment_method: "TRANSFER" })}
          >
            Transfer
          </Button>
        </div>
      </div>

      {quickSale && !isEdit && (
        <p className="text-xs text-muted-foreground">
          Pintasan: Ctrl+Enter simpan · Esc batal
        </p>
      )}
    </div>
  );

  const summaryPanel = quickSale && !isEdit && finalPriceNum > 0 && (
    <Card className="shadow-sm lg:sticky lg:top-6">
      <CardContent className="p-6 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold">{formatCurrency(finalPriceNum)}</span>
        </div>
        {isDp && dpAmountNum > 0 && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">DP</span>
              <span>{formatCurrency(dpAmountNum)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span>Sisa</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          </>
        )}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {form.payment_type === "CASH" ? "Pembayaran lunas" : "Pembayaran DP"}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className={quickSale && !isEdit ? "flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8" : ""}>
              {summaryPanel}
              <div>
                {formFields}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t border-border">
              <Button type="button" variant="outline" onClick={() => router.back()} className="min-h-[44px] w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className={`gap-2 min-h-[44px] w-full sm:w-auto ${quickSale ? "h-12 px-6 text-base" : ""}`}>
                {isSubmitting ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
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