"use client";

import { useTheme } from "@/providers/theme-provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

export function MobileHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 w-full border-b border-border bg-background shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Kiri: Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/60 flex-shrink-0 bg-muted flex items-center justify-center">
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
          <span className="font-bold text-sm tracking-tight text-foreground">
            Mebel Online
          </span>
        </div>

        {/* Kanan: Dark Mode Toggle + Logout */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-1.5 h-8 px-2.5 rounded-lg"
              aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-xs font-medium">
                {theme === "dark" ? "Terang" : "Gelap"}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 h-8 px-2.5 rounded-lg text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-medium">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}