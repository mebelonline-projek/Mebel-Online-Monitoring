"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Wrench,
  FileText,
  Settings,
} from "lucide-react";
import { useRef } from "react";

const getDashboardHref = (role: string) => {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "KARYAWAN") return "/dashboard/karyawan";
  return "/dashboard";
};

export function MobileBottomNav({ role }: { role: string }) {
  const allNavItems = [
    { label: "Dashboard", href: getDashboardHref(role), icon: LayoutDashboard },
    { label: "Transaksi", href: "/transaksi", icon: Receipt },
    { label: "Invoice", href: "/invoice", icon: FileText },
    { label: "Biaya", href: "/operasional", icon: Wrench },
    { label: "Setelan", href: "/pengaturan", icon: Settings, ownerOnly: true },
  ];
  const navItems = allNavItems.filter((item) => {
    if (item.ownerOnly && role !== "OWNER") return false;
    return true;
  });
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom bg-background border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.4)]">
      <div
        ref={scrollRef}
        className="flex items-center h-16 px-1 overflow-x-auto scrollbar-hide gap-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 min-w-0 h-full rounded-xl transition-all duration-200",
                navItems.length <= 5 ? "max-w-[20%]" : ""
              )}
              style={
                isActive
                  ? {
                      background:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                    }
                  : {}
              }
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium transition-colors whitespace-nowrap",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
