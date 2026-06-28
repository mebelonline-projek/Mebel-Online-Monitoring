"use client";

// ============================================================
// 🧾 HPP MANAGER CLIENT — Tambah/Edit/Hapus HPP
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { formatCurrency } from "@/lib/formatters";
import { hppItemSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const supabase = createClient();
  const isBatal = transactionStatus === "BATAL";

  const [items, setItems] = useState<HppItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", note: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HppItem | null>(null);

  const totalHpp = items.reduce((sum, item) => sum + item.amount, 0);

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
        const { error } = await supabase
          .from("hpp_items")
          .update({
            name: parsed.data.name,
            amount: parsed.data.amount,
            note: parsed.data.note || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        setItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, name: parsed.data.name, amount: parsed.data.amount, note: parsed.data.note || null }
              : item
          )
        );
        toast.success(`Item HPP "${parsed.data.name}" berhasil diupdate`);
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

        // Gunakan data item lengkap dari API response — tanpa refetch dari client
        if (result.data) {
          setItems((prev) => [...prev, result.data]);
        } else {
          // Fallback: refetch jika response tidak mengandung data
          const { data: freshItems } = await supabase
            .from("hpp_items")
            .select("*")
            .eq("transaction_id", transactionId)
            .order("created_at", { ascending: true });

          if (freshItems) setItems(freshItems);
        }
        toast.success(result.message);
      }
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
      const { error } = await supabase.from("hpp_items").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(`Item HPP "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus HPP");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold font-mono">{invoiceNumber}</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Kelola HPP (Harga Pokok Penjualan)</p>
        </div>
      </div>

      {/* Total HPP Card */}
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

      {/* Add/Edit Form */}
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
                <Input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
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

      {/* HPP Items List */}
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
        <Card className="shadow-sm overflow-hidden">
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

          {/* Total Footer */}
          <div className="p-4 bg-accent/30 border-t border-border flex justify-between items-center">
            <span className="font-bold">Total HPP:</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(totalHpp)}</span>
          </div>
        </Card>
      )}

      {/* Delete Alert */}
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