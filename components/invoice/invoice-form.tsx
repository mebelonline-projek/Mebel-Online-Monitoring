"use client";

// ============================================================
// 🧾 INVOICE FORM — Buat invoice baru
// ============================================================
// Invoice hanya untuk transaksi DP / menunggu pelunasan.
// Transaksi lunas → gunakan Nota.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

interface TransactionOption {
  id: string;
  transaction_number: string;
  final_price: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  remaining: number;
}

export function InvoiceForm() {
  const router = useRouter();
  const supabase = createClient();

  const [customerName, setCustomerName] = useState("");
  const [transactions, setTransactions] = useState<TransactionOption[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    async function loadTransactions() {
      setLoadingTx(true);

      const [{ data: txs }, { data: linked }, { data: payments }] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, transaction_number, final_price, status, created_at, customer_name")
          .in("status", ["DP", "MENUNGGU_PELUNASAN"])
          .order("created_at", { ascending: false }),
        supabase.from("invoice_items").select("transaction_id"),
        supabase.from("transaction_payments").select("transaction_id, amount"),
      ]);

      const linkedIds = new Set((linked || []).map((i) => i.transaction_id));
      const paidByTx = new Map<string, number>();
      for (const p of payments || []) {
        paidByTx.set(p.transaction_id, (paidByTx.get(p.transaction_id) || 0) + p.amount);
      }

      const available = (txs || [])
        .filter((t) => !linkedIds.has(t.id))
        .map((t) => ({
          ...t,
          remaining: t.final_price - (paidByTx.get(t.id) || 0),
        }))
        .filter((t) => t.remaining > 0);

      setTransactions(available);
      setLoadingTx(false);
    }

    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTxs = transactions.filter((t) => selectedTxIds.has(t.id));
  const totalAmount = selectedTxs.reduce((sum, t) => sum + t.final_price, 0);
  const totalRemaining = selectedTxs.reduce((sum, t) => sum + t.remaining, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTxIds.size === 0) {
      toast.error("Pilih minimal 1 transaksi");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || undefined,
          transaction_ids: Array.from(selectedTxIds),
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal membuat invoice");
      toast.success(result.message);
      router.push(`/invoice/${result.data.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buat Invoice Baru</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Invoice untuk tagihan sisa pembayaran. Transaksi yang sudah lunas gunakan Nota.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nama Pelanggan (opsional)</label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama pelanggan..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Pilih Transaksi <span className="text-destructive">*</span>
          </label>
          {loadingTx ? (
            <p className="text-muted-foreground text-sm">Memuat transaksi...</p>
          ) : transactions.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                Tidak ada transaksi DP atau menunggu pelunasan yang tersedia.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transactions.map((tx) => (
                <label
                  key={tx.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTxIds.has(tx.id)
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTxIds.has(tx.id)}
                    onChange={() => toggleTx(tx.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{tx.transaction_number}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(tx.created_at)}
                      {tx.customer_name ? ` — ${tx.customer_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatCurrency(tx.final_price)}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Sisa: {formatCurrency(tx.remaining)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedTxIds.size > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Ringkasan
              </p>
              <div className="flex justify-between text-sm">
                <span>{selectedTxIds.size} transaksi dipilih</span>
                <span>Total: {formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-1">
                <span>Sisa tagihan</span>
                <span>{formatCurrency(totalRemaining)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            placeholder="Catatan untuk invoice..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting || selectedTxIds.size === 0} className="gap-2">
            {isSubmitting ? "Membuat..." : (
              <>
                <Save className="w-4 h-4" />
                Buat Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
