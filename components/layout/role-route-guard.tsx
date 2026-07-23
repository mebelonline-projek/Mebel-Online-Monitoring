"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Redirect role GUDANG menjauh dari menu non-inventori. */
export function RoleRouteGuard({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (role !== "GUDANG") return;
    const allowed =
      pathname.startsWith("/gudang") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register");
    if (!allowed) {
      router.replace("/gudang/stok");
    }
  }, [role, pathname, router]);

  return null;
}
