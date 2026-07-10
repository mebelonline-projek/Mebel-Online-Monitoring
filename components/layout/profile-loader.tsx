"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import type { AppProfile } from "@/components/providers/profile-context";
import type { AppStore } from "@/components/providers/store-context";

let cachedProfile: AppProfile | null = null;
let cachedStore: AppStore | null = null;

export function ProfileLoader({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<AppProfile | null>(cachedProfile);
  const [store, setStore] = useState<AppStore | null>(cachedStore);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedProfile && cachedStore) return;

    let cancelled = false;

    Promise.all([
      fetch("/api/profile").then(async (res) => ({ res, json: await res.json() })),
      fetch("/api/store").then(async (res) => ({ res, json: await res.json() })),
    ])
      .then(([profileResult, storeResult]) => {
        if (cancelled) return;

        if (profileResult.res.status === 401) {
          router.replace("/login");
          return;
        }

        if (!profileResult.json.success) {
          throw new Error(profileResult.json.message || "Gagal memuat profil");
        }

        cachedProfile = profileResult.json.profile;
        setProfile(profileResult.json.profile);

        if (storeResult.json.success && storeResult.json.store) {
          cachedStore = storeResult.json.store;
          setStore(storeResult.json.store);
        } else {
          const fallback = { store_name: "Mebel Online", logo_url: null };
          cachedStore = fallback;
          setStore(fallback);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat profil");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return <p className="p-6 text-destructive">{error}</p>;
  }

  if (!profile || !store) {
    return <p className="p-6 text-muted-foreground">Memuat...</p>;
  }

  return (
    <AdminLayout profile={profile} initialStore={store}>
      {children}
    </AdminLayout>
  );
}
