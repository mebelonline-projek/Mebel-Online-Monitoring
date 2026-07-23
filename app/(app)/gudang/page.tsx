import { WarehouseListClient } from "@/components/inventory/warehouse-list-client";
import { getWarehouses, type WarehouseRow } from "@/lib/inventory";

export default async function GudangPage() {
  let warehouses: WarehouseRow[] = [];
  let loadError: string | null = null;
  try {
    warehouses = await getWarehouses();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat gudang";
  }

  return <WarehouseListClient initialWarehouses={warehouses} loadError={loadError} />;
}
