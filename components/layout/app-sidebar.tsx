"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Receipt, Wrench, Settings, Sun, Moon, FileText, Wallet, Users, Package, Warehouse, Tags, Boxes, ArrowLeftRight } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useEffect, useState } from "react";
import { shouldPrefetchNav } from "@/lib/nav-prefetch";
import { StoreLogo } from "@/components/shared/store-logo";
import { useStore } from "@/components/providers/store-context";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

const getDashboardHref = (role: string) => {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "GUDANG") return "/gudang/stok";
  if (role === "KARYAWAN") return "/dashboard/karyawan";
  return "/dashboard";
};

export function AppSidebar({ profile }: { profile: UserProfile }) {
  const { store } = useStore();
  const allNavItems = [
    { label: "Dashboard", href: getDashboardHref(profile.role), icon: LayoutDashboard, hideForGudang: true },
    { label: "Transaksi", href: "/transaksi", icon: Receipt, hideForGudang: true },
    { label: "Pelanggan", href: "/customer", icon: Users, hideForGudang: true },
    { label: "Produk", href: "/produk", icon: Package, hideForGudang: true },
    { label: "Gudang", href: "/gudang", icon: Warehouse, inventoryOnly: true },
    { label: "Kategori", href: "/gudang/kategori", icon: Tags, gudangOnly: true },
    { label: "Barang", href: "/gudang/barang", icon: Package, gudangOnly: true },
    { label: "Stok", href: "/gudang/stok", icon: Boxes, gudangOnly: true },
    { label: "Mutasi", href: "/gudang/mutasi", icon: ArrowLeftRight, gudangOnly: true },
    { label: "Piutang", href: "/piutang", icon: Wallet, ownerOnly: true },
    { label: "Invoice", href: "/invoice", icon: FileText, hideForGudang: true },
    { label: "Biaya", href: "/operasional", icon: Wrench, hideForGudang: true },
    { label: "Setelan", href: "/pengaturan", icon: Settings, ownerOnly: true },
  ];
  const navItems = allNavItems.filter((item) => {
    if (profile.role === "GUDANG") {
      return Boolean(item.inventoryOnly || item.gudangOnly);
    }
    if (item.gudangOnly) return false;
    if (item.ownerOnly && profile.role !== "OWNER") return false;
    if (item.inventoryOnly && profile.role !== "OWNER") return false;
    return true;
  });
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const brandName = store.store_name || "Mebel Online";

  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col fixed left-0 top-0 z-50 py-6 bg-sidebar border-r border-sidebar-border">
      <div className="px-6 mb-10 flex flex-col items-center text-center">
        <StoreLogo src={store.logo_url} alt={brandName} size="md" className="mb-3" />
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--sidebar-primary)" }}>
          {brandName}
        </h1>
        <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--muted-foreground)" }}>
          Monitoring
        </p>
      </div>

      <nav className="flex-grow space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} prefetch={shouldPrefetchNav(item.href)}>
              <div
                className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 group ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-r-4 border-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-primary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-3">
        {mounted && (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-primary text-xs gap-3"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4" />
                Mode Terang
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Mode Gelap
              </>
            )}
          </Button>
        )}
      </div>

      <div className="px-6 pt-6 mt-auto border-t border-sidebar-border/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <StoreLogo src={store.logo_url} alt={brandName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate text-sidebar-foreground">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {profile.role === "OWNER"
                ? "Owner Profile"
                : profile.role === "GUDANG"
                  ? "Petugas Gudang"
                  : profile.role}
            </p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-transparent text-xs" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Keluar
        </Button>
      </div>
    </aside>
  );
}
