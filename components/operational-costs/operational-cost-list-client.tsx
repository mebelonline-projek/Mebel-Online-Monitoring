"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createOperationalCost, updateOperationalCost, deleteOperationalCost, type OperationalCostRow } from "@/lib/operational-costs";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { operationalCostSchema } from "@/lib/validation";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Wallet } from "lucide-react";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

interface Props {
  costs: OperationalCostRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  bulan: string;
  dari: string;
  sampai: string;
  profileRole: string;
  distinctCategories: string[];
  onMutated?: () => void;
  clientNav?: {
    onBulanChange: (bulan: string) => void;
    onCustomRange: (dari: string, sampai: string) => void;
    onClearCustomRange: (bulan: string) => void;
    onPageChange: (page: number) => void;
  };
}

type CostForm = {
  name: string;
  amount: string;
  category: string;
};

export function OperationalCostListClient({
  costs: initialCosts,
  total,
  currentPage,
  totalPages,
  bulan,
  dari: initialDari,
  sampai: initialSampai,
  profileRole,
  distinctCategories,
  onMutated,
  clientNav,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OperationalCostRow | null>(null);
  const [deletingCost, setDeletingCost] = useState<OperationalCostRow | null>(null);
  const [form, setForm] = useState<CostForm>({ name: "", amount: "", category: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customDari, setCustomDari] = useState(initialDari);
  const [customSampai, setCustomSampai] = useState(initialSampai);

  const isOwner = profileRole === "OWNER";

  const handleBulanChange = (value: string) => {
    if (clientNav) {
      clientNav.onBulanChange(value);
      return;
    }
    const params = new URLSearchParams();
    params.set("bulan", value);
    params.set("page", "1");
    router.push(`/operasional?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!customDari || !customSampai) {
      toast.error("Isi tanggal dari dan sampai");
      return;
    }
    if (clientNav) {
      clientNav.onCustomRange(customDari, customSampai);
      return;
    }
    const params = new URLSearchParams();
    params.set("dari", customDari);
    params.set("sampai", customSampai);
    params.set("page", "1");
    router.push(`/operasional?${params.toString()}`);
  };

  const clearCustomRange = () => {
    setCustomDari("");
    setCustomSampai("");
    if (clientNav) {
      clientNav.onClearCustomRange(bulan);
      return;
    }
    const params = new URLSearchParams();
    params.set("bulan", bulan);
    params.set("page", "1");
    router.push(`/operasional?${params.toString()}`);
  };

  const resetForm = () => {
    setForm({ name: "", amount: "", category: "" });
    setFormErrors({});
    setEditingCost(null);
  };

  const openAddModal = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditModal = (cost: OperationalCostRow) => {
    setEditingCost(cost);
    setForm({ name: cost.name, amount: cost.amount.toString(), category: cost.category || "" });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    try {
      operationalCostSchema.parse({
        ...form,
        amount: Number(form.amount),
      });
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const field = err.path[0] as string;
          if (!errors[field]) errors[field] = err.message;
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        amount: Number(form.amount),
        category: form.category || "LAINNYA",
      };

      if (editingCost) {
        const result = await updateOperationalCost(editingCost.id, payload);
        if (!result.success) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          setDialogOpen(false);
          resetForm();
          if (onMutated) onMutated();
          else router.refresh();
        }
      } else {
        const result = await createOperationalCost(payload);
        if (!result.success) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          setDialogOpen(false);
          resetForm();
          if (onMutated) onMutated();
          else router.refresh();
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCost) return;
    setIsDeleting(true);
    try {
      const result = await deleteOperationalCost(deletingCost.id);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setDeletingCost(null);
        if (onMutated) onMutated();
        else router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setIsDeleting(false);
    }
  };

  const goToPage = (page: number) => {
    if (clientNav) {
      clientNav.onPageChange(page);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/operasional?${params.toString()}`);
  };

  const totalCost = initialCosts.reduce((sum, c) => sum + c.amount, 0);
  const periodLabel =
    initialDari && initialSampai
      ? `${initialDari} s/d ${initialSampai}`
      : MONTH_OPTIONS.find((o) => o.value === bulan)?.label || bulan;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Biaya Operasional</h1>
          <p className="text-muted-foreground text-sm mt-1">Catat pengeluaran toko</p>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Biaya
        </Button>
      </div>

      {/* Filter periode */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground shrink-0">Bulan:</label>
          <select
            value={bulan}
            onChange={(e) => handleBulanChange(e.target.value)}
            disabled={Boolean(initialDari && initialSampai)}
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Dari tanggal</label>
            <Input type="date" value={customDari} onChange={(e) => setCustomDari(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Sampai tanggal</label>
            <Input type="date" value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={applyCustomRange} className="min-h-[40px]">
            Terapkan
          </Button>
          {(initialDari || initialSampai) && (
            <Button type="button" variant="outline" onClick={clearCustomRange} className="min-h-[40px]">
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {initialCosts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              Belum Ada Biaya {periodLabel}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Belum ada catatan pengeluaran untuk bulan ini.
            </p>
            <Button onClick={openAddModal} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Tambah Biaya
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Total Card */}
          <Card className="shadow-sm bg-primary/5 border-primary/10">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Total Biaya {periodLabel}
              </p>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
            </CardContent>
          </Card>

          <div className="md:hidden space-y-3">
            {initialCosts.map((cost) => (
              <Card key={cost.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {cost.category || "LAINNYA"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(cost.created_at)}</span>
                  </div>
                  <p className="font-semibold">{cost.name}</p>
                  <p className="text-lg font-bold">{formatCurrency(cost.amount)}</p>
                  {isOwner && (
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(cost)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setDeletingCost(cost);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Hapus
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
                    <TableHead>Kategori</TableHead>
                    <TableHead>Nama Biaya</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Tanggal</TableHead>
                    {isOwner && <TableHead className="w-[80px]">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {cost.category || "LAINNYA"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{cost.name}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(cost.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(cost.created_at)}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditModal(cost)}
                              aria-label="Edit biaya"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingCost(cost);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label="Hapus biaya"
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
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Halaman {currentPage} dari {totalPages} ({total} biaya)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="gap-1"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingCost ? "Edit Biaya" : "Tambah Biaya"}</DialogTitle>
            <DialogDescription>
              {editingCost ? "Ubah nama atau jumlah biaya." : "Catat pengeluaran toko."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Biaya <span className="text-destructive">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Listrik bulan ini"
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah (Rp) <span className="text-destructive">*</span></label>
              <CurrencyInput
                value={form.amount}
                onChange={(val) => setForm({ ...form, amount: val })}
                placeholder="1.000.000"
                className={formErrors.amount ? "border-destructive" : ""}
              />
              {formErrors.amount && <p className="text-destructive text-xs">{formErrors.amount}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Contoh: LISTRIK, SEWA (ketik manual atau pilih di bawah)"
                className={formErrors.category ? "border-destructive" : ""}
              />
              {formErrors.category && <p className="text-destructive text-xs">{formErrors.category}</p>}
              {distinctCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {distinctCategories.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setForm({ ...form, category: cat })}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingCost ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Biaya</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong className="text-foreground">{deletingCost?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}