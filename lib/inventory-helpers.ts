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
