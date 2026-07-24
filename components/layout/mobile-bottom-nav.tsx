"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Plus,
  Boxes,
  Package,
  ArrowLeftRight,
  Warehouse,
} from "lucide-react";
import { MobileNavMenu } from "@/components/layout/mobile-nav-menu";
import { shouldPrefetchNav } from "@/lib/nav-prefetch";
import { getDashboardHref } from "@/lib/dashboard-href";

export function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname();

  if (role === "GUDANG") {
    const items = [
      { label: "Stok", href: "/gudang/stok", icon: Boxes },
      { label: "Barang", href: "/gudang/barang", icon: Package },
      { label: "Mutasi", href: "/gudang/mutasi", icon: ArrowLeftRight },
      { label: "Gudang", href: "/gudang", icon: Warehouse },
    ];

    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-5 items-end h-16 px-1 max-w-lg mx-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/gudang"
                ? pathname === "/gudang"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={shouldPrefetchNav(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center h-full min-h-[44px] rounded-xl transition-colors",
                  isActive && "text-primary"
                )}
                style={
                  isActive
                    ? { background: "color-mix(in srgb, var(--primary) 12%, transparent)" }
                    : undefined
                }
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span
                  className={cn(
                    "text-[10px] mt-0.5 font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <MobileNavMenu role={role} />
        </div>
      </nav>
    );
  }

  const dashboardHref = getDashboardHref(role);
  const primaryItems = [
    { label: "Home", href: dashboardHref, icon: LayoutDashboard },
    { label: "Transaksi", href: "/transaksi", icon: Receipt },
  ];
  const isKasirActive = pathname.startsWith("/kasir") || pathname.startsWith("/transaksi/tambah");

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 items-end h-16 px-1 max-w-lg mx-auto">
        {primaryItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={shouldPrefetchNav(item.href)}
              className={cn(
                "flex flex-col items-center justify-center h-full min-h-[44px] rounded-xl transition-colors",
                isActive && "text-primary"
              )}
              style={
                isActive
                  ? { background: "color-mix(in srgb, var(--primary) 12%, transparent)" }
                  : undefined
              }
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <Link
          href="/kasir"
          prefetch={false}
          className="flex flex-col items-center justify-end -mt-4 pb-0.5"
          aria-label="Kasir — transaksi baru"
        >
          <div
            className={cn(
              "flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-transform active:scale-95",
              isKasirActive
                ? "bg-primary ring-2 ring-primary/30"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span
            className={cn(
              "text-[10px] mt-0.5 font-semibold",
              isKasirActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            Kasir
          </span>
        </Link>

        <Link
          href="/customer"
          prefetch={shouldPrefetchNav("/customer")}
          className={cn(
            "flex flex-col items-center justify-center h-full min-h-[44px] rounded-xl transition-colors",
            pathname.startsWith("/customer") && "text-primary"
          )}
          style={
            pathname.startsWith("/customer")
              ? { background: "color-mix(in srgb, var(--primary) 12%, transparent)" }
              : undefined
          }
        >
          <Users
            className={cn(
              "w-5 h-5",
              pathname.startsWith("/customer") ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-[10px] mt-0.5 font-medium",
              pathname.startsWith("/customer") ? "text-primary" : "text-muted-foreground"
            )}
          >
            Pelanggan
          </span>
        </Link>

        <MobileNavMenu role={role} />
      </div>
    </nav>
  );
}
