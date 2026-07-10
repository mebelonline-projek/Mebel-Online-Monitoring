"use client";

import { SerwistProvider } from "@serwist/next/react";
import { useEffect, type ReactNode } from "react";
import { setupOfflineSyncListeners } from "@/lib/offline-sync";

const isDev = process.env.NODE_ENV === "development";

async function clearDevServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const cleanup = setupOfflineSyncListeners();

    if (isDev) {
      clearDevServiceWorkers().catch(() => {
        // Abaikan — dev tanpa service worker
      });
    }

    return cleanup;
  }, []);

  if (isDev) {
    return <>{children}</>;
  }

  return (
    <SerwistProvider swUrl="/sw.js" register>
      {children}
    </SerwistProvider>
  );
}
