import { ProductInventoryClient } from "@/components/inventory/product-inventory-client";
import {
  getInventoryProducts,
  getCategories,
  getWarehouseStocks,
  getWarehouses,
  type InventoryProductRow,
  type CategoryRow,
  type StockRow,
  type WarehouseRow,
} from "@/lib/inventory";

export default async function GudangBarangPage() {
  let products: InventoryProductRow[] = [];
  let categories: CategoryRow[] = [];
  let stocks: StockRow[] = [];
  let warehouses: WarehouseRow[] = [];
  let loadError: string | null = null;
  try {
    [products, categories, stocks, warehouses] = await Promise.all([
      getInventoryProducts(),
      getCategories(),
      getWarehouseStocks(),
      getWarehouses(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat barang";
  }

  return (
    <ProductInventoryClient
      initialProducts={products}
      initialCategories={categories}
      initialStocks={stocks}
      initialWarehouses={warehouses}
      loadError={loadError}
    />
  );
}
