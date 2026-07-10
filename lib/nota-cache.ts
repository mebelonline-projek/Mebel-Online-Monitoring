"use client";

import { offlineDb } from "@/lib/offline-db";

export async function cacheNotaHtml(transactionId: string, html: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.cachedNotas.put({
    transactionId,
    html,
    cachedAt: Date.now(),
  });
}

export async function getCachedNotaHtml(transactionId: string): Promise<string | null> {
  if (!offlineDb) return null;
  const row = await offlineDb.cachedNotas.get(transactionId);
  return row?.html ?? null;
}
