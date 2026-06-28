"use client";

// ============================================================
// 📱 USE MEDIA QUERY
// ============================================================
// Generic media query hook. Pakai useSyncExternalStore untuk SSR safety.
//
// @example
// ```ts
// const isDesktop = useMediaQuery("(min-width: 1024px)");
// const isDark = useMediaQuery("(prefers-color-scheme: dark)");
// ```
// ============================================================

import { useSyncExternalStore } from "react";

function getServerSnapshot() {
  return false;
}

function getSubscribe(query: string) {
  return (onStoreChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  };
}

function getSnapshot(query: string) {
  return () => window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    getSubscribe(query),
    getSnapshot(query),
    getServerSnapshot,
  );
}