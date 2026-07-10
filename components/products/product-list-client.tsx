"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductRow,
} from "@/lib/products";
import { productSchema } from "@/lib/validation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { invalidatePickerCache } from "@/lib/picker-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  products: ProductRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  query: string;
  profileRole: string;
  onMutated?: () => void;
  clientNav?: {
    onQueryChange: (q: string) => void;
    onPageChange: (page: number) => void;
  };
}

type FormState = { name: string; category: string; description: string; base_price: string };

export function ProductListClient({
  products,
  total,
  currentPage,
  totalPages,
  query: initialQuery,
  profileRole,
  onMutated,
  clientNav,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOwner = profileRole === "OWNER";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", category: "LAINNYA", description: "", base_price: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const buildUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      sp.set("page", "1");
      return `/produk?${sp.toString()}`;
    },
    [searchParams]
  );

  useEffect(() => {
    if (searchQuery === initialQuery) return;
    const t = setTimeout(() => {
      if (clientNav) clientNav.onQueryChange(searchQuery);
      else router.push(buildUrl({ q: searchQuery }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, initialQuery, router, buildUrl, clientNav]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", category: "LAINNYA", description: "", base_price: "" });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description || "",
      base_price: p.base_price.toString(),
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const parsed = productSchema.safeParse({
      ...form,
      base_price: Number(form.base_price) || 0,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setFormErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = editing
        ? await updateProduct(editing.id, parsed.data)
        : await createProduct(parsed.data);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      invalidatePickerCache();
      setDialogOpen(false);
      if (onMutated) onMutated();
      else router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteProduct(deleteTarget.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    invalidatePickerCache();
    setDeleteTarget(null);
    if (onMutated) onMutated();
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Produk</h1>
          <p className="text-muted-foreground text-sm mt-1">Katalog produk furnitur</p>
        </div>
        {isOwner && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        )}
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari produk atau kategori..."
          className="pl-9"
        />
      </div>

      {products.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada produk</p>
            {isOwner && (
              <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Tambah Produk
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <Card key={p.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <Badge variant="secondary">{p.category}</Badge>
                  </div>
                  <p className="font-bold text-primary">{formatCurrency(p.base_price)}</p>
                  {isOwner && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga Dasar</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  {isOwner && <TableHead className="w-[100px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.base_price)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {p.description || "—"}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(p)}
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
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages} ({total} produk)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    if (clientNav) clientNav.onPageChange(currentPage - 1);
                    else {
                      const sp = new URLSearchParams(searchParams.toString());
                      sp.set("page", String(currentPage - 1));
                      router.push(`/produk?${sp.toString()}`);
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    if (clientNav) clientNav.onPageChange(currentPage + 1);
                    else {
                      const sp = new URLSearchParams(searchParams.toString());
                      sp.set("page", String(currentPage + 1));
                      router.push(`/produk?${sp.toString()}`);
                    }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Produk *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori</label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="LAINNYA" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Harga Dasar (Rp)</label>
              <CurrencyInput
                value={form.base_price}
                onChange={(val) => setForm({ ...form, base_price: val })}
                placeholder="1.000.000"
              />
              {formErrors.base_price && <p className="text-destructive text-xs">{formErrors.base_price}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus <strong>{deleteTarget?.name}</strong>? Transaksi lama tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
