"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  uploadProductPhoto,
  addInventoryVariant,
  updateInventoryVariant,
  type InventoryProductRow,
  type CategoryRow,
  type StockRow,
  type WarehouseRow,
} from "@/lib/inventory";
import {
  getTotalStock,
  isParentShellProduct,
  productDisplayName,
} from "@/lib/inventory-helpers";
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
import { Plus, Pencil, Trash2, Package, Search, X } from "lucide-react";
import Link from "next/link";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function compressPhotoForUpload(file: File): Promise<File> {
  if (file.size <= 1_200_000) return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

type FormState = {
  name: string;
  category_id: string;
  base_price: string;
  min_stock: string;
  description: string;
  warehouse_id: string;
  initial_qty: string;
  has_variants: boolean;
};

type VariantDraft = {
  key: string;
  warna: string;
  ukuran: string;
  base_price: string;
};

type VariantEditState = {
  id: string;
  parentId: string;
  warna: string;
  ukuran: string;
  base_price: string;
  min_stock: string;
};

type ListGroup = {
  key: string;
  parent: InventoryProductRow;
  variants: InventoryProductRow[];
  isGroup: boolean;
};

function ProductThumb({
  name,
  photoUrl,
  onPreview,
}: {
  name: string;
  photoUrl: string | null;
  onPreview?: (url: string, name: string) => void;
}) {
  if (photoUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview?.(photoUrl, name);
        }}
        aria-label={`Lihat foto ${name}`}
        className="h-10 w-10 shrink-0 rounded-md overflow-hidden ring-offset-background transition hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="h-full w-full object-cover cursor-pointer" />
      </button>
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

function newVariantDraft(basePrice = ""): VariantDraft {
  return {
    key: crypto.randomUUID(),
    warna: "",
    ukuran: "",
    base_price: basePrice,
  };
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
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string; name: string } | null>(
    null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [variantEdit, setVariantEdit] = useState<VariantEditState | null>(null);
  const [addVariantParent, setAddVariantParent] = useState<InventoryProductRow | null>(null);
  const [addVariantForm, setAddVariantForm] = useState({
    warna: "",
    ukuran: "",
    base_price: "",
    min_stock: "0",
  });
  const photoCompressRef = useRef<Promise<File> | null>(null);

  const pickPhoto = (file: File | null) => {
    setPhotoFile(file);
    photoCompressRef.current = file ? compressPhotoForUpload(file) : null;
  };

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
    has_variants: false,
  });

  const categoryName = (p: InventoryProductRow) =>
    initialCategories.find((c) => c.id === p.category_id)?.name || p.category || "";

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialProducts.filter((p) => {
      const cat = categoryName(p);
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (!q) return true;
      const hay = [p.name, cat, p.warna || "", p.ukuran || "", productDisplayName(p)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialProducts, initialCategories, searchQuery, categoryFilter]);

  const groups = useMemo(() => {
    const childrenByParent = new Map<string, InventoryProductRow[]>();
    for (const p of filtered) {
      if (!p.parent_id) continue;
      const list = childrenByParent.get(p.parent_id) || [];
      list.push(p);
      childrenByParent.set(p.parent_id, list);
    }

    const result: ListGroup[] = [];
    const used = new Set<string>();

    for (const p of filtered) {
      if (p.parent_id) continue;
      const kids =
        childrenByParent.get(p.id) ||
        initialProducts.filter((c) => c.parent_id === p.id).filter((c) => {
          // include siblings even if filter hit parent only
          if (!searchQuery.trim() && !categoryFilter) return true;
          return filtered.some((f) => f.id === c.id) || filtered.some((f) => f.id === p.id);
        });

      // When searching a variant, ensure parent group appears
      const visibleKids = kids.filter((c) => filtered.some((f) => f.id === c.id));
      if (visibleKids.length > 0 || isParentShellProduct(p, initialProducts)) {
        for (const c of visibleKids) used.add(c.id);
        used.add(p.id);
        result.push({
          key: p.id,
          parent: p,
          variants: visibleKids.length
            ? visibleKids
            : kids.filter((c) => filtered.some((f) => f.id === c.id || f.id === p.id)),
          isGroup: true,
        });
      } else {
        used.add(p.id);
        result.push({ key: p.id, parent: p, variants: [], isGroup: false });
      }
    }

    for (const p of filtered) {
      if (!p.parent_id || used.has(p.id)) continue;
      const parent =
        initialProducts.find((x) => x.id === p.parent_id) || p;
      result.push({
        key: `orphan-${p.id}`,
        parent,
        variants: [p],
        isGroup: true,
      });
    }

    return result;
  }, [filtered, initialProducts, searchQuery, categoryFilter]);

  const isFiltered = Boolean(searchQuery.trim()) || Boolean(categoryFilter);

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
    pickPhoto(null);
    setForm({
      name: "",
      category_id: initialCategories[0]?.id || "",
      base_price: "",
      min_stock: "0",
      description: "",
      warehouse_id: defaultWarehouseId,
      initial_qty: "0",
      has_variants: false,
    });
    setVariantDrafts([]);
    setDialogOpen(true);
  };

  const openEdit = (p: InventoryProductRow) => {
    // Edit parent shell or standalone only
    const target =
      p.parent_id
        ? initialProducts.find((x) => x.id === p.parent_id) || p
        : p;
    if (target.parent_id) {
      openVariantEdit(target);
      return;
    }
    setEditing(target);
    pickPhoto(null);
    setForm({
      name: target.name,
      category_id: target.category_id || initialCategories[0]?.id || "",
      base_price: String(target.base_price),
      min_stock: String(target.min_stock),
      description: target.description || "",
      warehouse_id: defaultWarehouseId,
      initial_qty: "0",
      has_variants: isParentShellProduct(target, initialProducts),
    });
    setVariantDrafts([]);
    setDialogOpen(true);
  };

  const openVariantEdit = (v: InventoryProductRow) => {
    setVariantEdit({
      id: v.id,
      parentId: v.parent_id || "",
      warna: v.warna || "",
      ukuran: v.ukuran || "",
      base_price: String(v.base_price),
      min_stock: String(v.min_stock),
    });
  };

  const uploadPhotoInBackground = (
    productId: string,
    file: File,
    compressPromise: Promise<File> | null
  ) => {
    const toastId = toast.loading("Mengunggah foto...");
    void (async () => {
      try {
        const compressed = await (compressPromise ?? compressPhotoForUpload(file));
        if (compressed.size > MAX_UPLOAD_BYTES) {
          toast.error(
            `Foto terlalu besar (${Math.round(compressed.size / 1024 / 1024)}MB). Edit barang & pilih foto lebih kecil.`,
            { id: toastId }
          );
          return;
        }
        const fd = new FormData();
        fd.append("file", compressed);
        const up = await uploadProductPhoto(productId, fd);
        if (!up.success) {
          toast.error(up.message, { id: toastId });
          return;
        }
        toast.success("Foto tersimpan", { id: toastId });
        router.refresh();
      } catch {
        toast.error("Gagal mengunggah foto. Coba edit barang lalu pilih ulang.", {
          id: toastId,
        });
      }
    })();
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter");
      return;
    }
    if (!form.category_id) {
      toast.error("Pilih kategori");
      return;
    }

    if (!editing && form.has_variants) {
      if (variantDrafts.length === 0) {
        toast.error("Tambah minimal 1 varian");
        return;
      }
      for (const v of variantDrafts) {
        if (!v.warna.trim() && !v.ukuran.trim()) {
          toast.error("Setiap varian wajib isi warna dan/atau ukuran");
          return;
        }
      }
      const keys = variantDrafts.map(
        (v) => `${v.warna.trim().toLowerCase()}||${v.ukuran.trim().toLowerCase()}`
      );
      if (new Set(keys).size !== keys.length) {
        toast.error("Ada varian duplikat (warna + ukuran sama)");
        return;
      }
    }

    const initialQty = Math.max(0, Number(form.initial_qty) || 0);
    if (!editing && !form.has_variants && initialQty > 0 && !form.warehouse_id) {
      toast.error("Pilih gudang untuk stok awal");
      return;
    }

    const pendingPhoto = photoFile;
    const pendingCompress = photoCompressRef.current;

    setBusy(true);
    const payload = {
      name: form.name,
      category_id: form.category_id,
      base_price: Number(form.base_price) || 0,
      min_stock: Math.max(0, Number(form.min_stock) || 0),
      description: form.description.trim() || "",
    };

    if (editing) {
      const productId = editing.id;
      const result = await updateInventoryProduct(productId, payload);
      setBusy(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDialogOpen(false);
      router.refresh();
      if (pendingPhoto) {
        uploadPhotoInBackground(productId, pendingPhoto, pendingCompress);
      }
      return;
    }

    const result = await createInventoryProduct({
      ...payload,
      warehouse_id: form.has_variants ? null : form.warehouse_id || null,
      initial_qty: form.has_variants ? 0 : initialQty,
      variants: form.has_variants
        ? variantDrafts.map((v) => ({
            warna: v.warna.trim(),
            ukuran: v.ukuran.trim(),
            base_price: Number(v.base_price) || Number(form.base_price) || 0,
            min_stock: Math.max(0, Number(form.min_stock) || 0),
          }))
        : undefined,
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setDialogOpen(false);
    router.refresh();
    if (pendingPhoto && result.data?.id) {
      uploadPhotoInBackground(result.data.id, pendingPhoto, pendingCompress);
    }
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

  const handleSaveVariantEdit = async () => {
    if (!variantEdit) return;
    if (!variantEdit.warna.trim() && !variantEdit.ukuran.trim()) {
      toast.error("Isi warna dan/atau ukuran");
      return;
    }
    setBusy(true);
    const result = await updateInventoryVariant(variantEdit.id, {
      warna: variantEdit.warna,
      ukuran: variantEdit.ukuran,
      base_price: Number(variantEdit.base_price) || 0,
      min_stock: Math.max(0, Number(variantEdit.min_stock) || 0),
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setVariantEdit(null);
    router.refresh();
  };

  const handleAddVariant = async () => {
    if (!addVariantParent) return;
    if (!addVariantForm.warna.trim() && !addVariantForm.ukuran.trim()) {
      toast.error("Isi warna dan/atau ukuran");
      return;
    }
    setBusy(true);
    const result = await addInventoryVariant(addVariantParent.id, {
      warna: addVariantForm.warna,
      ukuran: addVariantForm.ukuran,
      base_price: Number(addVariantForm.base_price) || addVariantParent.base_price,
      min_stock: Math.max(0, Number(addVariantForm.min_stock) || 0),
    });
    setBusy(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setAddVariantParent(null);
    router.refresh();
  };

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  const renderVariantBadges = (v: InventoryProductRow) => (
    <div className="flex flex-wrap gap-1">
      {v.warna && <Badge variant="secondary">{v.warna}</Badge>}
      {v.ukuran && <Badge variant="outline">{v.ukuran}</Badge>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Master barang (pcs). Bisa tanpa varian, atau dengan warna/ukuran.
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
          className="gap-2 min-h-[44px]"
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
            placeholder="Cari barang, kategori, warna, ukuran..."
            className="pl-9 min-h-[44px] h-11"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex min-h-[44px] h-11 w-full sm:w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua kategori</option>
          {initialCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] gap-1"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("");
            }}
          >
            <X className="w-4 h-4" />
            Reset
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {isFiltered ? "Tidak ada hasil untuk filter ini" : "Belum ada barang"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {groups.map((g) => {
              const cat = categoryName(g.parent) || "—";
              if (!g.isGroup || g.variants.length === 0) {
                const p = g.parent;
                const total = getTotalStock(initialStocks, p.id);
                const low = total < p.min_stock;
                return (
                  <Card key={g.key} className="shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <ProductThumb
                          name={p.name}
                          photoUrl={p.photo_url}
                          onPreview={(url, n) => setPhotoLightbox({ url, name: n })}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate">{p.name}</p>
                            <Badge variant="secondary">{cat}</Badge>
                          </div>
                          <p className="font-bold text-primary">
                            {formatCurrency(p.base_price)}
                          </p>
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
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddVariantParent(p);
                            setAddVariantForm({
                              warna: "",
                              ukuran: "",
                              base_price: String(p.base_price),
                              min_stock: String(p.min_stock),
                            });
                          }}
                        >
                          + Varian
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
              }

              return (
                <Card key={g.key} className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <ProductThumb
                        name={g.parent.name}
                        photoUrl={g.parent.photo_url}
                        onPreview={(url, n) => setPhotoLightbox({ url, name: n })}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{g.parent.name}</p>
                          <Badge variant="secondary">{cat}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {g.variants.length} varian
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {g.variants.map((v) => {
                        const total = getTotalStock(initialStocks, v.id);
                        return (
                          <div
                            key={v.id}
                            className="rounded-lg border border-border bg-accent/20 p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                {renderVariantBadges(v)}
                                <p className="font-semibold text-primary">
                                  {formatCurrency(v.base_price)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Stok: {total} pcs
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => openVariantEdit(v)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteTarget(v)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(g.parent)}>
                        Edit Produk
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddVariantParent(g.parent);
                          setAddVariantForm({
                            warna: "",
                            ukuran: "",
                            base_price: String(g.parent.base_price),
                            min_stock: String(g.parent.min_stock),
                          });
                        }}
                      >
                        + Varian
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(g.parent)}
                      >
                        Hapus Semua
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
                  <TableHead className="w-[140px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => {
                  const cat = categoryName(g.parent) || "—";
                  if (!g.isGroup || g.variants.length === 0) {
                    const p = g.parent;
                    const total = getTotalStock(initialStocks, p.id);
                    const low = total < p.min_stock;
                    return (
                      <TableRow key={g.key}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              name={p.name}
                              photoUrl={p.photo_url}
                              onPreview={(url, n) => setPhotoLightbox({ url, name: n })}
                            />
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
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                setAddVariantParent(p);
                                setAddVariantForm({
                                  warna: "",
                                  ukuran: "",
                                  base_price: String(p.base_price),
                                  min_stock: String(p.min_stock),
                                });
                              }}
                            >
                              + Varian
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
                  }

                  return (
                    <Fragment key={g.key}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5}>
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              name={g.parent.name}
                              photoUrl={g.parent.photo_url}
                              onPreview={(url, n) => setPhotoLightbox({ url, name: n })}
                            />
                            <div>
                              <p className="font-semibold">{g.parent.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {g.variants.length} varian · {cat}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => openEdit(g.parent)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setAddVariantParent(g.parent);
                                setAddVariantForm({
                                  warna: "",
                                  ukuran: "",
                                  base_price: String(g.parent.base_price),
                                  min_stock: String(g.parent.min_stock),
                                });
                              }}
                            >
                              + Varian
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteTarget(g.parent)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {g.variants.map((v) => {
                        const total = getTotalStock(initialStocks, v.id);
                        const low = total < v.min_stock;
                        return (
                          <TableRow key={v.id}>
                            <TableCell>
                              <div className="pl-12 space-y-1">
                                {renderVariantBadges(v)}
                                <p className="text-xs text-muted-foreground">
                                  {productDisplayName(v)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{cat}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(v.base_price)}
                            </TableCell>
                            <TableCell>{v.min_stock}</TableCell>
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
                                  onClick={() => openVariantEdit(v)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteTarget(v)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 px-4 pt-4 pr-12">
            <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
            <div className="flex justify-center">
              {editing?.photo_url && !photoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editing.photo_url}
                  alt={editing.name}
                  className="h-28 w-28 max-h-28 max-w-28 rounded-md object-cover border"
                />
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-28 w-28 max-h-28 max-w-28 rounded-md object-cover border"
                />
              ) : (
                <div className="h-28 w-28 max-h-28 max-w-28 rounded-md bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground border border-dashed">
                  <Package className="w-6 h-6" />
                  <span className="text-[10px] text-center px-1">Preview foto</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Foto (opsional)</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => pickPhoto(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nama</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama barang"
                className="min-h-[44px] h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="flex min-h-[44px] h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                {initialCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {form.has_variants ? "Harga referensi" : "Harga jual"}
              </label>
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
                className="min-h-[44px] h-11"
              />
            </div>

            {!editing && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Produk memiliki varian</p>
                    <p className="text-xs text-muted-foreground">
                      Warna, ukuran, atau keduanya. Matikan jika satu barang saja.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={form.has_variants ? "default" : "outline"}
                    className="min-h-[44px] shrink-0"
                    onClick={() =>
                      setForm((f) => {
                        const next = !f.has_variants;
                        if (next && variantDrafts.length === 0) {
                          setVariantDrafts([newVariantDraft(f.base_price)]);
                        }
                        return { ...f, has_variants: next };
                      })
                    }
                    aria-pressed={form.has_variants}
                  >
                    {form.has_variants ? "Aktif" : "Nonaktif"}
                  </Button>
                </div>

                {form.has_variants && (
                  <div className="space-y-3">
                    {variantDrafts.map((v, idx) => (
                      <div
                        key={v.key}
                        className="rounded-lg bg-accent/30 border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Varian {idx + 1}
                          </p>
                          {variantDrafts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive"
                              onClick={() =>
                                setVariantDrafts((list) => list.filter((x) => x.key !== v.key))
                              }
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Warna</label>
                            <Input
                              value={v.warna}
                              onChange={(e) =>
                                setVariantDrafts((list) =>
                                  list.map((x) =>
                                    x.key === v.key ? { ...x, warna: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="opsional"
                              className="min-h-[44px] h-11"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Ukuran</label>
                            <Input
                              value={v.ukuran}
                              onChange={(e) =>
                                setVariantDrafts((list) =>
                                  list.map((x) =>
                                    x.key === v.key ? { ...x, ukuran: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="opsional"
                              className="min-h-[44px] h-11"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Harga jual</label>
                          <CurrencyInput
                            value={v.base_price}
                            onChange={(val) =>
                              setVariantDrafts((list) =>
                                list.map((x) =>
                                  x.key === v.key ? { ...x, base_price: val } : x
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full min-h-[44px] gap-1"
                      onClick={() =>
                        setVariantDrafts((list) => [...list, newVariantDraft(form.base_price)])
                      }
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Varian
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Akan dibuat {variantDrafts.length} varian. Stok diisi lewat Mutasi IN.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!editing && !form.has_variants && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gudang stok awal</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                    className="flex min-h-[44px] h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {activeWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.is_sales_warehouse ? " (penjualan)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Qty stok awal</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.initial_qty}
                    onChange={(e) => setForm((f) => ({ ...f, initial_qty: e.target.value }))}
                    placeholder="0"
                    className="min-h-[44px] h-11"
                  />
                </div>
              </>
            )}

            {editing && form.has_variants && (
              <p className="text-xs text-muted-foreground rounded-lg border border-border p-3">
                Produk ini punya varian. Edit nama/kategori di sini; kelola warna/ukuran lewat
                tombol Edit pada tiap varian.
              </p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Deskripsi (opsional)</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-[44px] h-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">Satuan: pcs</p>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={busy}>
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!variantEdit}
        onOpenChange={(open) => {
          if (!open) setVariantEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Varian</DialogTitle>
          </DialogHeader>
          {variantEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Warna</label>
                  <Input
                    value={variantEdit.warna}
                    onChange={(e) =>
                      setVariantEdit((v) => (v ? { ...v, warna: e.target.value } : v))
                    }
                    className="min-h-[44px] h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ukuran</label>
                  <Input
                    value={variantEdit.ukuran}
                    onChange={(e) =>
                      setVariantEdit((v) => (v ? { ...v, ukuran: e.target.value } : v))
                    }
                    className="min-h-[44px] h-11"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Harga jual</label>
                <CurrencyInput
                  value={variantEdit.base_price}
                  onChange={(val) =>
                    setVariantEdit((v) => (v ? { ...v, base_price: val } : v))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Stok minimum</label>
                <Input
                  type="number"
                  min={0}
                  value={variantEdit.min_stock}
                  onChange={(e) =>
                    setVariantEdit((v) => (v ? { ...v, min_stock: e.target.value } : v))
                  }
                  className="min-h-[44px] h-11"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVariantEdit(null)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSaveVariantEdit} disabled={busy}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!addVariantParent}
        onOpenChange={(open) => {
          if (!open) setAddVariantParent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Varian</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Produk: <strong>{addVariantParent?.name}</strong>
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Warna</label>
                <Input
                  value={addVariantForm.warna}
                  onChange={(e) =>
                    setAddVariantForm((f) => ({ ...f, warna: e.target.value }))
                  }
                  className="min-h-[44px] h-11"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ukuran</label>
                <Input
                  value={addVariantForm.ukuran}
                  onChange={(e) =>
                    setAddVariantForm((f) => ({ ...f, ukuran: e.target.value }))
                  }
                  className="min-h-[44px] h-11"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Harga jual</label>
              <CurrencyInput
                value={addVariantForm.base_price}
                onChange={(val) => setAddVariantForm((f) => ({ ...f, base_price: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddVariantParent(null)}>
              Batal
            </Button>
            <Button type="button" onClick={handleAddVariant} disabled={busy}>
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!photoLightbox}
        onOpenChange={(open) => {
          if (!open) setPhotoLightbox(null);
        }}
      >
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] gap-0 border-0 bg-black/95 p-2 text-white ring-0 sm:max-w-2xl dark:bg-black/95 [&_button]:text-white [&_button]:hover:bg-white/15"
          aria-describedby={undefined}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {photoLightbox ? `Foto ${photoLightbox.name}` : "Preview foto"}
            </DialogTitle>
          </DialogHeader>
          {photoLightbox ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoLightbox.url}
              alt={photoLightbox.name}
              className="mx-auto max-h-[85dvh] w-full object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus barang permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${productDisplayName(deleteTarget)}${
                    !deleteTarget.parent_id &&
                    isParentShellProduct(deleteTarget, initialProducts)
                      ? " beserta semua variannya"
                      : ""
                  } akan dihapus. Ditolak jika masih ada stok.`
                : ""}
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
