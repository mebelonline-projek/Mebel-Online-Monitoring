"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TTL_MS = 60_000;

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const memory = new Map<string, CacheEntry<unknown>>();

export function invalidateListCache(prefix: string): void {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

/** Invalidate list transaksi + piutang setelah mutasi yang mengubah status/uang/HPP. */
export function invalidateTransactionRelatedCaches(): void {
  invalidateListCache("transactions:");
  invalidateListCache("piutang:");
}

export function seedListCache<T>(key: string, data: T): void {
  memory.set(key, { data, ts: Date.now() });
}

export function useCachedList<T>(key: string, fetcher: () => Promise<T>, initialData?: T) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const readCache = () => {
    const hit = memory.get(key);
    if (!hit) return null;
    if (Date.now() - hit.ts > TTL_MS) {
      memory.delete(key);
      return null;
    }
    return hit.data as T;
  };

  const [data, setData] = useState<T | null>(() => {
    const cached = readCache();
    if (cached) return cached;
    if (initialData !== undefined) {
      memory.set(key, { data: initialData, ts: Date.now() });
      return initialData;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (readCache() !== null) return false;
    if (initialData !== undefined) return false;
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const revalidate = useCallback(() => {
    memory.delete(key);
    setTick((v) => v + 1);
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache();

    const apply = (next: T) => {
      if (cancelled) return;
      memory.set(key, { data: next, ts: Date.now() });
      setData(next);
      setLoading(false);
      setError(null);
    };

    const load = async (background: boolean) => {
      if (!background) setLoading(data === null);
      try {
        const next = await fetcherRef.current();
        apply(next);
      } catch (err) {
        if (cancelled) return;
        if (!cached && initialData === undefined) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
          setLoading(false);
        }
      }
    };

    if (cached || initialData !== undefined) {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
      load(true);
    } else {
      load(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  return { data, loading, error, revalidate };
}

export function syncListUrl(path: string, params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && !(k === "page" && String(v) === "1")) {
      sp.set(k, String(v));
    }
  });
  const qs = sp.toString();
  window.history.replaceState(null, "", qs ? `${path}?${qs}` : path);
}
