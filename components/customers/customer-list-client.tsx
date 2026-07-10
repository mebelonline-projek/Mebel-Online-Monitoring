"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type CustomerRow,
} from "@/lib/customers";
import { customerSchema } from "@/lib/validation";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { invalidatePickerCache } from "@/lib/picker-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  customers: CustomerRow[];
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

type FormState = { name: string; phone: string; address: string; note: string };

export function CustomerListClient({
  customers,
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
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", address: "", note: "" });
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
      return `/customer?${sp.toString()}`;
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
    setForm({ name: "", phone: "", address: "", note: "" });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerRow) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
      note: c.note || "",
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const f = i.path[0] as string;
        errs[f] = i.message;
      });
      setFormErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = editing
        ? await updateCustomer(editing.id, parsed.data)
        : await createCustomer(parsed.data);
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
    const result = await deleteCustomer(deleteTarget.id);
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola data pelanggan toko</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau telepon..."
          className="pl-9"
        />
      </div>

      {customers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada pelanggan</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Tambah Pelanggan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <Card key={c.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold">{c.name}</p>
                  {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                  {c.address && <p className="text-xs text-muted-foreground line-clamp-2">{c.address}</p>}
                  <div className="flex gap-2 pt-1">
                    {isOwner && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Sejak</TableHead>
                  {isOwner && <TableHead className="w-[100px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {c.address || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(c.created_at)}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(c)}
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
                Halaman {currentPage} dari {totalPages} ({total} pelanggan)
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
                      router.push(`/customer?${sp.toString()}`);
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
                      router.push(`/customer?${sp.toString()}`);
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
            <DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telepon</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alamat</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
            <AlertDialogTitle>Hapus Pelanggan</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus <strong>{deleteTarget?.name}</strong>? Transaksi lama tetap aman — hanya data master yang dihapus.
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
