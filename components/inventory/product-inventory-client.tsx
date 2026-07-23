"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  uploadProductPhoto,
  type InventoryProductRow,
  type CategoryRow,
  type StockRow,
  type WarehouseRow,
} from "@/lib/inventory";
import { getTotalStock } from "@/lib/inventory-helpers";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import Link from "next/link";

type FormState = {
  name: string;
  category_id: string;
  base_price: string;
  min_stock: string;
  description: string;
  warehouse_id: string;
  initial_qty: string;
};

function ProductThumb({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <div
      className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center text-muted-foreground"
      title={name}
      aria-hidden
    >
      <Package className="w-4 h-4" />
    </div>
  );
}

export function ProductInventoryClient({
  initialProducts,
  initialCategories,
  initialStocks,
  initialWarehouses,
  loadError,
}: {
  initialProducts: InventoryProductRow[];
  initialCategories: CategoryRow[];
  initialStocks: StockRow[];
  initialWarehouses: WarehouseRow[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const activeWarehouses = initialWarehouses.filter((w) => w.is_active);
  const defaultWarehouseId =
    activeWarehouses.find((w) => !w.is_sales_warehouse)?.id ||
    activeWarehouses.find((w) => w.is_sales_warehouse)?.id ||
    activeWarehouses[0]?.id ||
    "";

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryProductRow | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  const [form, setForm] = useState<FormState>({
    name: "",
    category_id: initialCategories[0]?.id || "",
    base_price: "",
    min_stock: "0",
    description: "",
    warehouse_id: defaultWarehouseId,
    initial_qty: "0",
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialProducts.filter((p) => {
      const cat =
        initialCategories.find((c) => c.id === p.category_id)?.name || p.category || "";
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [initialProducts, initialCategories, searchQuery, categoryFilter]);

  const openCreate = () => {
    if (initialCategories.length === 0) {
      toast.error("Buat kategori dulu di menu Kategori");
      return;
    }
    if (activeWarehouses.length === 0) {
      toast.error("Buat gudang dulu di menu Gudang");
      return;
    }
    setEditing(null);
    setPhotoFile(null);
    setForm({
      name: "",
      category_id: initialCategories[0]?.id || "",
      base_price: "",
      min_stock: "0",
      description: "",
      warehouse_id: defaultWarehouseId,
      initial_qty: "0",
    });
    setDialogOpen(true);
  };

  const openEdit = (p: InventoryProductRow) => {
    setEditing(p);
    setPhotoFile(null);
    setForm({
      name: p.name,
      category_id: p.category_id || initialCategories[0]?.id || "",
      base_price: String(p.base_price),
      min_stock: String(p.min_stock),
      description: p.description || "",
      warehouse_id: defaultWarehouseId,
      initial_qty: "0",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter");
      return;
    }
    if (!form.category_id) {
      toast.error("Pilih kategori dulu");
      return;
    }
    const initialQty = Math.max(0, Number(form.initial_qty) || 0);
    if (!editing && initialQty > 0 && !form.warehouse_id) {
      toast.error("Pilih gudang untuk stok awal");
      return;
    }

    setBusy(true);
    const payload = {
      name: form.name,
      category_id: form.category_id,
      base_price: Number(form.base_price) || 0,
      min_stock: Math.max(0, Number(form.min_stock) || 0),
      description: form.description.trim() || "",
    };

    if (editing) {
      const result = await updateInventoryProduct(editing.id, payload);
      if (!result.success) {
        setBusy(false);
        toast.error(result.message);
        return;
      }
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const up = await uploadProductPhoto(editing.id, fd);
        if (!up.success) {
          setBusy(false);
          toast.error(up.message);
          return;
        }
      }
      setBusy(false);
      toast.success(result.message);
      setDialogOpen(false);
      router.refresh();
      return;
    }

    const result = await createInventoryProduct({
      ...payload,
      warehouse_id: form.warehouse_id || null,
      initial_qty: initialQty,
    });
    if (!result.success) {
      setBusy(false);
      toast.error(result.message);
      return;
    }
    if (photoFile && result.data?.id) {
      const fd = new FormData();
      fd.append("file", photoFile);
      const up = await uploadProductPhoto(result.data.id, fd);
      if (!up.success) {
        setBusy(false);
        toast.error(`Barang dibuat, tapi foto gagal: ${up.message}`);
        router.refresh();
        return;
      }
    }
    setBusy(false);
    toast.success(result.message);
    setDialogOpen(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteInventoryProduct(deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  };

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Master barang (pcs). Saat tambah, pilih gudang + stok awal (opsional).
          </p>
          {initialCategories.length === 0 && (
            <p className="text-sm text-destructive">
              Belum ada kategori —{" "}
              <Link href="/gudang/kategori" className="underline font-medium">
                buat kategori dulu
              </Link>{" "}
              agar bisa menambah barang.
            </p>
          )}
          {activeWarehouses.length === 0 && (
            <p className="text-sm text-destructive">
              Belum ada gudang —{" "}
              <Link href="/gudang" className="underline font-medium">
                buat gudang dulu
              </Link>
              .
            </p>
          )}
        </div>
        <Button
          onClick={openCreate}
          className="gap-2"
          disabled={initialCategories.length === 0 || activeWarehouses.length === 0}
        >
          <Plus className="w-4 h-4" />
          Tambah Barang
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barang atau kategori..."
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua kategori</option>
          {initialCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada barang</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((p) => {
              const cat =
                initialCategories.find((c) => c.id === p.category_id)?.name ||
                p.category ||
                "—";
              const total = getTotalStock(initialStocks, p.id);
              const low = total < p.min_stock;
              return (
                <Card key={p.id} className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <ProductThumb name={p.name} photoUrl={p.photo_url} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{p.name}</p>
                          <Badge variant="secondary">{cat}</Badge>
                        </div>
                        <p className="font-bold text-primary">{formatCurrency(p.base_price)}</p>
                        <p className="text-xs text-muted-foreground">
                          Stok total: {total} pcs
                          {low && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-destructive border-destructive/40"
                            >
                              Di bawah min ({p.min_stock})
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead className="w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const cat =
                    initialCategories.find((c) => c.id === p.category_id)?.name ||
                    p.category ||
                    "—";
                  const total = getTotalStock(initialStocks, p.id);
                  const low = total < p.min_stock;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProductThumb name={p.name} photoUrl={p.photo_url} />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cat}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(p.base_price)}
                      </TableCell>
                      <TableCell>{p.min_stock}</TableCell>
                      <TableCell>
                        <span className={low ? "text-destructive font-semibold" : ""}>
                          {total} pcs
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                          >
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center">
              {editing?.photo_url && !photoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editing.photo_url}
                  alt={editing.name}
                  className="h-40 w-40 max-h-40 max-w-40 rounded-md object-cover border"
                />
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-40 w-40 max-h-40 max-w-40 rounded-md object-cover border"
                />
              ) : (
                <div className="h-40 w-40 max-h-40 max-w-40 rounded-md bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground border border-dashed">
                  <Package className="w-8 h-8" />
                  <span className="text-xs text-center px-2">Preview foto (max 160px)</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Foto (opsional)</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">JPEG, PNG, atau WebP · dikompres WebP otomatis</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nama</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama barang"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {initialCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Harga referensi</label>
              <CurrencyInput
                value={form.base_price}
                onChange={(v) => setForm((f) => ({ ...f, base_price: v }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stok minimum</label>
              <Input
                type="number"
                min={0}
                value={form.min_stock}
                onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
              />
            </div>
            {!editing && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gudang stok awal</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {activeWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.is_sales_warehouse ? " (penjualan)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Default: Gudang Utama. Bisa diisi 0 lalu Mutasi IN nanti.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Qty stok awal</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.initial_qty}
                    onChange={(e) => setForm((f) => ({ ...f, initial_qty: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Deskripsi (opsional)</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">Satuan: pcs</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus barang permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} dan fotonya akan dihapus (hard delete). Riwayat transaksi tetap
              menyimpan nama/harga. Ditolak jika masih ada stok.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
