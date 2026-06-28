"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export function AdminLayout({ children, profile }: { children: React.ReactNode; profile: UserProfile }) {
  return (
    <div className="min-h-screen bg-background wood-texture">
      {/* Sidebar untuk desktop */}
      <AppSidebar profile={profile} />

      {/* Mobile Header — top bar di mobile */}
      <MobileHeader />

      {/* Content area */}
      <div className="lg:ml-64 pb-16 lg:pb-0">
        <main>
          {children}
        </main>
      </div>

      {/* Bottom navigation untuk mobile */}
      <MobileBottomNav role={profile.role} />
    </div>
  );
}
