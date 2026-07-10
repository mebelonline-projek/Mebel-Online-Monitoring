"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  Wallet,
  FileText,
  Wrench,
  Settings,
  Plus,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { shouldPrefetchNav } from "@/lib/nav-prefetch";

const getDashboardHref = (role: string) => {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "KARYAWAN") return "/dashboard/karyawan";
  return "/dashboard";
};

interface Props {
  role: string;
  triggerClassName?: string;
}

export function MobileNavMenu({ role, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { label: "Kasir", href: "/kasir", icon: Plus },
    { label: "Dashboard", href: getDashboardHref(role), icon: LayoutDashboard },
    { label: "Transaksi", href: "/transaksi", icon: Receipt },
    { label: "Pelanggan", href: "/customer", icon: Users },
    { label: "Produk", href: "/produk", icon: Package },
    { label: "Piutang", href: "/piutang", icon: Wallet, ownerOnly: true },
    { label: "Invoice", href: "/invoice", icon: FileText },
    { label: "Biaya Operasional", href: "/operasional", icon: Wrench },
    { label: "Pengaturan", href: "/pengaturan", icon: Settings, ownerOnly: true },
  ].filter((item) => !item.ownerOnly || role === "OWNER");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-center justify-center flex-1 min-w-0 h-full rounded-xl transition-colors",
            triggerClassName
          )}
          aria-label="Menu navigasi"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] mt-1 font-medium text-muted-foreground">Menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <SheetTitle>Navigasi</SheetTitle>
        </SheetHeader>
        <nav className="grid grid-cols-2 gap-2 pt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={shouldPrefetchNav(item.href)}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 min-h-[48px] transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary font-semibold"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
