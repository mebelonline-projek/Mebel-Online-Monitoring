"use client";

import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SearchablePicker } from "@/components/shared/searchable-picker";
import type { ProductRow } from "@/lib/products";
import { Plus, Trash2 } from "lucide-react";

export interface LineItem {
  key: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  note: string;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  products: ProductRow[];
}

function newLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    product_id: null,
    product_name: "",
    quantity: 1,
    unit_price: "",
    note: "",
  };
}

export function LineItemsEditor({ items, onChange, products }: Props) {
  const productOptions = products.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: `${p.category} — ${formatCurrency(p.base_price)}`,
  }));

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.key !== key));
  };

  const addItem = () => {
    onChange([...items, newLine()]);
  };

  const total = items.reduce(
    (sum, item) => sum + item.quantity * (Number(item.unit_price) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Produk / Item</label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
          <Plus className="w-4 h-4" />
          Tambah Baris
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.key}
            className="rounded-lg border border-border p-4 space-y-3 bg-accent/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Item {index + 1}
              </span>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeItem(item.key)}
                  aria-label="Hapus baris"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <SearchablePicker
              label="Produk"
              placeholder="Cari produk..."
              options={productOptions}
              value={item.product_id}
              onChange={(id, opt) => {
                const product = products.find((p) => p.id === id);
                updateItem(item.key, {
                  product_id: id,
                  product_name: opt?.label || item.product_name,
                  unit_price: product?.base_price ? product.base_price.toString() : item.unit_price,
                });
              }}
              manualValue={item.product_name}
              onManualChange={(v) =>
                updateItem(item.key, { product_name: v, product_id: null })
              }
              manualPlaceholder="Atau ketik nama produk..."
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Qty</label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Harga Satuan</label>
                <CurrencyInput
                  value={item.unit_price}
                  onChange={(val) => updateItem(item.key, { unit_price: val })}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <p className="text-sm text-right font-semibold">
              Subtotal: {formatCurrency(item.quantity * (Number(item.unit_price) || 0))}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">Total semua item</span>
        <span className="text-xl font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export function createDefaultLineItems(): LineItem[] {
  return [newLine()];
}

export function lineItemsTotal(items: LineItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * (Number(item.unit_price) || 0),
    0
  );
}
