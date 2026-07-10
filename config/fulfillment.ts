export const FULFILLMENT_STATUSES = [
  { value: "MENUNGGU", label: "Menunggu" },
  { value: "PRODUKSI", label: "Produksi" },
  { value: "SIAP_KIRIM", label: "Siap Kirim" },
  { value: "SELESAI", label: "Selesai" },
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]["value"];

export function getFulfillmentLabel(status: string): string {
  return FULFILLMENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}
