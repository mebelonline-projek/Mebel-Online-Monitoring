"use client";

import { useTheme } from "@/providers/theme-provider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { StoreLogo } from "@/components/shared/store-logo";
import { useStore } from "@/components/providers/store-context";

export function MobileHeader() {
  const { store } = useStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const brandName = store.store_name || "Mebel Online";

  return (
    <header className="lg:hidden sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <StoreLogo src={store.logo_url} alt={brandName} size="xs" />
          <span className="font-bold text-sm tracking-tight text-foreground truncate">
            {brandName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {mounted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 p-0 rounded-lg sm:h-8 sm:w-auto sm:px-2.5 sm:gap-1.5"
              aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden sm:inline text-xs font-medium">
                {theme === "dark" ? "Terang" : "Gelap"}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-10 w-10 p-0 rounded-lg sm:h-8 sm:w-auto sm:px-2.5 sm:gap-1.5 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
