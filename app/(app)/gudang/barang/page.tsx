import { ProductInventoryClient } from "@/components/inventory/product-inventory-client";
import {
  getInventoryProducts,
  getCategories,
  getWarehouseStocks,
  type InventoryProductRow,
  type CategoryRow,
  type StockRow,
} from "@/lib/inventory";

export default async function GudangBarangPage() {
  let products: InventoryProductRow[] = [];
  let categories: CategoryRow[] = [];
  let stocks: StockRow[] = [];
  let loadError: string | null = null;
  try {
    [products, categories, stocks] = await Promise.all([
      getInventoryProducts(),
      getCategories(),
      getWarehouseStocks(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat barang";
  }

  return (
    <ProductInventoryClient
      initialProducts={products}
      initialCategories={categories}
      initialStocks={stocks}
      loadError={loadError}
    />
  );
}
