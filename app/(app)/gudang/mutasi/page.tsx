import { MovementClient } from "@/components/inventory/movement-client";
import {
  getInventoryProducts,
  getWarehouses,
  getWarehouseStocks,
  getStockMovements,
  type InventoryProductRow,
  type WarehouseRow,
  type StockRow,
  type MovementRow,
} from "@/lib/inventory";

export default async function GudangMutasiPage() {
  let products: InventoryProductRow[] = [];
  let warehouses: WarehouseRow[] = [];
  let stocks: StockRow[] = [];
  let movements: MovementRow[] = [];
  let loadError: string | null = null;
  try {
    [products, warehouses, stocks, movements] = await Promise.all([
      getInventoryProducts(),
      getWarehouses(),
      getWarehouseStocks(),
      getStockMovements(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat mutasi";
  }

  return (
    <MovementClient
      products={products}
      warehouses={warehouses}
      stocks={stocks}
      movements={movements}
      loadError={loadError}
    />
  );
}
