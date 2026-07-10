"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface AppStore {
  store_name: string;
  logo_url: string | null;
}

interface StoreContextValue {
  store: AppStore;
  setStoreLogo: (logoUrl: string | null) => void;
  setStoreName: (name: string) => void;
  refreshStore: () => Promise<void>;
}

const defaultStore: AppStore = {
  store_name: "Mebel Online",
  logo_url: null,
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  initialStore,
  children,
}: {
  initialStore?: AppStore;
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<AppStore>(initialStore ?? defaultStore);

  const setStoreLogo = useCallback((logoUrl: string | null) => {
    setStore((prev) => ({ ...prev, logo_url: logoUrl }));
  }, []);

  const setStoreName = useCallback((name: string) => {
    setStore((prev) => ({ ...prev, store_name: name }));
  }, []);

  const refreshStore = useCallback(async () => {
    try {
      const res = await fetch("/api/store");
      const json = await res.json();
      if (res.ok && json.success && json.store) {
        setStore(json.store);
      }
    } catch {
      // Abaikan — state lama tetap dipakai
    }
  }, []);

  return (
    <StoreContext.Provider value={{ store, setStoreLogo, setStoreName, refreshStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore harus dipakai di dalam StoreProvider");
  }
  return ctx;
}

/** Untuk halaman tanpa StoreProvider (login) */
export function useStoreOptional(): StoreContextValue | null {
  return useContext(StoreContext);
}
