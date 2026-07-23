"use client";

// ============================================================
// 🧾 HPP MANAGER CLIENT — Tambah/Edit/Hapus HPP
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { hppItemSchema } from "@/lib/validation";
import { invalidateTransactionRelatedCaches } from "@/lib/use-cached-list";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { ArrowLeft, Plus, X, Pencil, Trash2, Package } from "lucide-react";

interface HppItem {
  id: string;
  transaction_id: string;
  name: string;
  amount: number;
  note: string | null;
  created_by: string;
  created_at: string;
}

interface Props {
  transactionId: string;
  invoiceNumber: string;
  transactionStatus: string;
  hppItems: HppItem[];
}

export function HppManagerClient({
  transactionId,
  invoiceNumber,
  transactionStatus,
  hppItems: initialItems,
}: Props) {
  const router = useRouter();
  const isBatal = transactionStatus === "BATAL";

  const [items, setItems] = useState<HppItem[]>(initialItems);
  const [dirty, setDirty] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", note: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HppItem | null>(null);

  const totalHpp = items.reduce((sum, item) => sum + item.amount, 0);

  const goBackToDetail = () => {
    if (dirty) {
      invalidateTransactionRelatedCaches();
      router.push(`/transaksi/${transactionId}`);
      router.refresh();
    } else {
      router.back();
    }
  };

  const afterMutation = () => {
    setDirty(true);
    invalidateTransactionRelatedCaches();
  };

  const resetForm = () => {
    setForm({ name: "", amount: "", note: "" });
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (item: HppItem) => {
    setForm({
      name: item.name,
      amount: item.amount.toString(),
      note: item.note || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      transaction_id: transactionId,
      name: form.name,
      amount: Number(form.amount),
      note: form.note || "",
    };

    const parsed = hppItemSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const response = await fetch(`/api/hpp-items/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mengupdate HPP");
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, name: parsed.data.name, amount: parsed.data.amount, note: parsed.data.note || null }
              : item
          )
        );
        toast.success(result.message);
      } else {
        const response = await fetch("/api/hpp-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal menambah HPP");
        }

        if (result.data) {
          setItems((prev) => [...prev, result.data]);
        }
        toast.success(result.message);
      }
      afterMutation();
      resetForm();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/hpp-items/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus HPP");
      }

      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(result.message);
      setDeleteTarget(null);
      afterMutation();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus HPP");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="sm" onClick={goBackToDetail} className="gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold font-mono">{invoiceNumber}</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Kelola HPP (Harga Pokok Penjualan)</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Total HPP
            </p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalHpp)}</p>
          </div>
          {!isBatal && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              {showForm ? (
                <>
                  <X className="w-4 h-4" />
                  Batal
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Tambah HPP
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {showForm && !isBatal && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "Edit Item HPP" : "Tambah Item HPP"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Nama Item <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Kayu Jati, Cat, Paku, Ongkos Kirim..."
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Jumlah (Rp) <span className="text-destructive">*</span>
                </label>
                <CurrencyInput
                  value={form.amount}
                  onChange={(val) => setForm({ ...form, amount: val })}
                  placeholder="1.000.000"
                  className={formErrors.amount ? "border-destructive" : ""}
                />
                {formErrors.amount && <p className="text-destructive text-xs">{formErrors.amount}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Catatan</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  placeholder="Catatan opsional..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Item HPP</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tambahkan biaya HPP untuk menghitung estimasi laba kotor transaksi ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-lg font-bold">{formatCurrency(item.amount)}</p>
                  {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                  {!isBatal && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Catatan</TableHead>
                  {!isBatal && <TableHead className="w-[100px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.name}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.note || "—"}
                    </TableCell>
                    {!isBatal && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEdit(item)}
                            aria-label="Edit HPP"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                            aria-label="Hapus HPP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 bg-accent/30 border-t border-border flex justify-between items-center">
            <span className="font-bold">Total HPP:</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(totalHpp)}</span>
          </div>
        </Card>
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item HPP</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus item HPP <strong className="text-foreground">{deleteTarget?.name}</strong>?
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
