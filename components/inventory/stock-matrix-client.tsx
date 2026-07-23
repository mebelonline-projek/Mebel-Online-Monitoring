"use client";

import {
  type InventoryProductRow,
  type WarehouseRow,
  type CategoryRow,
  type StockRow,
} from "@/lib/inventory";
import { getStockQty, getTotalStock } from "@/lib/inventory-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Boxes } from "lucide-react";

export function StockMatrixClient({
  products,
  warehouses,
  categories,
  stocks,
  loadError,
}: {
  products: InventoryProductRow[];
  warehouses: WarehouseRow[];
  categories: CategoryRow[];
  stocks: StockRow[];
  loadError?: string | null;
}) {
  const activeWarehouses = warehouses.filter((w) => w.is_active);

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (products.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-16 text-center">
          <Boxes className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Belum ada data stok</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Matriks stok per gudang. Badge muncul jika total di bawah stok minimum.
      </p>

      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const total = getTotalStock(stocks, p.id);
          const low = total < p.min_stock;
          const cat =
            categories.find((c) => c.id === p.category_id)?.name || p.category || "—";
          return (
            <Card key={p.id} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{cat}</p>
                  </div>
                  {low && (
                    <Badge
                      variant="outline"
                      className="text-destructive border-destructive/40 shrink-0"
                    >
                      Min {p.min_stock}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {activeWarehouses.map((w) => (
                    <div key={w.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {w.name}
                        {w.is_sales_warehouse ? " ★" : ""}
                      </span>
                      <span className="font-medium">
                        {getStockQty(stocks, p.id, w.id)} pcs
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm border-t pt-1 font-semibold">
                    <span>Total</span>
                    <span className={low ? "text-destructive" : ""}>{total} pcs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barang</TableHead>
              {activeWarehouses.map((w) => (
                <TableHead key={w.id} className="text-right whitespace-nowrap">
                  {w.name}
                  {w.is_sales_warehouse ? " ★" : ""}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Alert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const total = getTotalStock(stocks, p.id);
              const low = total < p.min_stock;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold whitespace-nowrap">{p.name}</TableCell>
                  {activeWarehouses.map((w) => (
                    <TableCell key={w.id} className="text-right tabular-nums">
                      {getStockQty(stocks, p.id, w.id)}
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${low ? "text-destructive" : ""}`}
                  >
                    {total}
                  </TableCell>
                  <TableCell>
                    {low ? (
                      <Badge
                        variant="outline"
                        className="text-destructive border-destructive/40"
                      >
                        Di bawah min ({p.min_stock})
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
