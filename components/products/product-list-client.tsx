"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { deleteProduct, type ProductRow } from "@/lib/products";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { invalidatePickerCache } from "@/lib/picker-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Package, Search, ChevronLeft, ChevronRight, Warehouse } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

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
          <p className="text-muted-foreground text-sm mt-1">
            Katalog untuk kasir. Tambah/edit barang &amp; stok di menu Gudang.
          </p>
        </div>
        {isOwner && (
          <Button asChild className="gap-2">
            <Link href="/gudang/barang">
              <Warehouse className="w-4 h-4" />
              Kelola di Gudang
            </Link>
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
              <Button asChild variant="outline" className="mt-4 gap-2">
                <Link href="/gudang/barang">
                  <Plus className="w-4 h-4" />
                  Tambah di Gudang
                </Link>
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
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/gudang/barang">Edit di Gudang</Link>
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
                  {isOwner && <TableHead className="w-[140px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.base_price)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {p.description || "—"}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild className="h-8">
                            <Link href="/gudang/barang">Gudang</Link>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus <strong>{deleteTarget?.name}</strong>? Ditolak jika masih ada stok.
              Transaksi lama tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
