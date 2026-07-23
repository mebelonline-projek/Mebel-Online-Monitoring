"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Warehouse, Tags, Package, Boxes, ArrowLeftRight } from "lucide-react";

const items = [
  { href: "/gudang", label: "Gudang", icon: Warehouse, exact: true },
  { href: "/gudang/kategori", label: "Kategori", icon: Tags },
  { href: "/gudang/barang", label: "Barang", icon: Package },
  { href: "/gudang/stok", label: "Stok", icon: Boxes },
  { href: "/gudang/mutasi", label: "Mutasi", icon: ArrowLeftRight },
];

export function GudangSubnav() {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventori Gudang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola stok multi gudang</p>
      </div>

      <nav
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 rounded-2xl border border-border/80 bg-muted/50 p-1.5 dark:bg-muted/30"
        aria-label="Menu inventori"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-background text-foreground font-semibold shadow-sm ring-1 ring-border dark:bg-card"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-background/40"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/80 text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground dark:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
