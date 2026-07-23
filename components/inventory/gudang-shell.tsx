"use client";

import { GudangSubnav } from "@/components/inventory/gudang-subnav";

export function GudangShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <GudangSubnav />
      {children}
    </div>
  );
}
