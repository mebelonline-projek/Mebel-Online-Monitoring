"use client";

// ============================================================
// 📱 USE IS MOBILE
// ============================================================
// Mobile detection hook. Pakai useSyncExternalStore untuk SSR safety.
// ============================================================

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function getServerSnapshot(): boolean {
  return false;
}

function getSubscribe(onStoreChange: () => void) {
  return () => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(getSubscribe, getSnapshot, getServerSnapshot);
}
