/** Pure helpers for inventori UI (bukan server action). */

export type StockQtyRow = {
  warehouse_id: string;
  product_id: string;
  qty: number;
};

export function getStockQty(
  stocks: StockQtyRow[],
  productId: string,
  warehouseId: string
): number {
  return stocks.find((s) => s.product_id === productId && s.warehouse_id === warehouseId)?.qty ?? 0;
}

export function getTotalStock(stocks: StockQtyRow[], productId: string): number {
  return stocks.filter((s) => s.product_id === productId).reduce((sum, s) => sum + s.qty, 0);
}

/** Label kasir/stok: "Nama — Warna / Ukuran" */
export function productDisplayName(p: {
  name: string;
  warna?: string | null;
  ukuran?: string | null;
}): string {
  const parts = [p.warna, p.ukuran].filter((x) => x && String(x).trim());
  if (parts.length === 0) return p.name;
  return `${p.name} — ${parts.join(" / ")}`;
}

export function isParentShellProduct(
  p: { id: string; parent_id?: string | null },
  all: { id: string; parent_id?: string | null }[]
): boolean {
  if (p.parent_id) return false;
  return all.some((c) => c.parent_id === p.id);
}

export function isSellableProduct(
  p: { id: string; parent_id?: string | null },
  all: { id: string; parent_id?: string | null }[]
): boolean {
  return !isParentShellProduct(p, all);
}
