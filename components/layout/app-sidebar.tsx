"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Receipt, Wrench, Settings, Sun, Moon, FileText } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

const getDashboardHref = (role: string) => {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "KARYAWAN") return "/dashboard/karyawan";
  return "/dashboard";
};

export function AppSidebar({ profile }: { profile: UserProfile }) {
  const allNavItems = [
    { label: "Dashboard", href: getDashboardHref(profile.role), icon: LayoutDashboard },
    { label: "Transaksi", href: "/transaksi", icon: Receipt },
    { label: "Invoice", href: "/invoice", icon: FileText },
    { label: "Biaya", href: "/operasional", icon: Wrench },
    { label: "Setelan", href: "/pengaturan", icon: Settings, ownerOnly: true },
  ];
  const navItems = allNavItems.filter((item) => {
    if (item.ownerOnly && profile.role !== "OWNER") return false;
    return true;
  });
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col fixed left-0 top-0 z-50 py-6 bg-sidebar border-r border-sidebar-border">
      {/* Logo + Brand — centered */}
      <div className="px-6 mb-10 flex flex-col items-center text-center">
        {!imgError && (
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-sidebar-accent/30 flex items-center justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Logo"
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--sidebar-primary)" }}>
          Mebel Online
        </h1>
        <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--muted-foreground)" }}>
          Monitoring
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
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

      {/* Theme Toggle */}
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

      {/* Profile + Logo kecil + Logout */}
      <div className="px-6 pt-6 mt-auto border-t border-sidebar-border/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Logo kecil di kiri bawah */}
          <div className="w-10 h-10 rounded-full border border-primary/40 overflow-hidden flex-shrink-0 bg-sidebar-accent/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Logo"
              className="w-full h-full object-contain p-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate text-sidebar-foreground">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {profile.role === "OWNER" ? "Owner Profile" : profile.role}
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