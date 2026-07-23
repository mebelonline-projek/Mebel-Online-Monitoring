import { StockMatrixClient } from "@/components/inventory/stock-matrix-client";
import {
  getInventoryBundle,
  type InventoryProductRow,
  type WarehouseRow,
  type CategoryRow,
  type StockRow,
} from "@/lib/inventory";

export default async function GudangStokPage() {
  let products: InventoryProductRow[] = [];
  let warehouses: WarehouseRow[] = [];
  let categories: CategoryRow[] = [];
  let stocks: StockRow[] = [];
  let loadError: string | null = null;
  try {
    const bundle = await getInventoryBundle();
    products = bundle.products;
    warehouses = bundle.warehouses;
    categories = bundle.categories;
    stocks = bundle.stocks;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat stok";
  }

  return (
    <StockMatrixClient
      products={products}
      warehouses={warehouses}
      categories={categories}
      stocks={stocks}
      loadError={loadError}
    />
  );
}
