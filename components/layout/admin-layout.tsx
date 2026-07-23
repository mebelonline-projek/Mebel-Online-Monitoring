"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { NavWarmup } from "@/components/layout/nav-warmup";
import { RoleRouteGuard } from "@/components/layout/role-route-guard";
import { ProfileProvider, type AppProfile } from "@/components/providers/profile-context";
import { StoreProvider, type AppStore } from "@/components/providers/store-context";

interface UserProfile extends AppProfile {}

export function AdminLayout({
  children,
  profile,
  initialStore,
}: {
  children: React.ReactNode;
  profile: UserProfile;
  initialStore: AppStore;
}) {
  return (
    <ProfileProvider profile={profile}>
      <StoreProvider initialStore={initialStore}>
        <div className="min-h-screen bg-background overflow-x-hidden">
          <RoleRouteGuard role={profile.role} />
          <NavWarmup role={profile.role} />
          <OfflineBanner />
          <AppSidebar profile={profile} />
          <MobileHeader />
          <div className="lg:ml-64 pb-safe lg:pb-0 min-w-0">
            <main className="max-w-7xl mx-auto w-full">{children}</main>
          </div>
          <MobileBottomNav role={profile.role} />
        </div>
      </StoreProvider>
    </ProfileProvider>
  );
}
