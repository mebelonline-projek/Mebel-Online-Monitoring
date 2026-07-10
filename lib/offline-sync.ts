"use client";

import type { PendingTransaction } from "@/lib/offline-db";
import { offlineDb } from "@/lib/offline-db";
import { toast } from "sonner";

let isSyncing = false;

export async function flushPendingTransactions(): Promise<number> {
  if (!offlineDb || isSyncing || !navigator.onLine) return 0;

  const pending = await offlineDb.pendingTransactions
    .where("status")
    .equals("pending")
    .sortBy("createdAt");

  if (pending.length === 0) return 0;

  isSyncing = true;
  let synced = 0;

  try {
    for (const item of pending) {
      await offlineDb.pendingTransactions.update(item.clientId, { status: "syncing" });

      try {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item.payload, client_id: item.clientId }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal sync transaksi");
        }

        await offlineDb.pendingTransactions.update(item.clientId, { status: "synced" });
        synced += 1;
      } catch (error) {
        await offlineDb.pendingTransactions.update(item.clientId, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Sync gagal",
        });
      }
    }

    if (synced > 0) {
      toast.success(`${synced} transaksi offline berhasil disinkronkan`);
    }
  } finally {
    isSyncing = false;
  }

  return synced;
}

export async function queueOfflineTransaction(
  payload: PendingTransaction["payload"]
): Promise<string> {
  if (!offlineDb) throw new Error("Offline database tidak tersedia");

  const clientId = crypto.randomUUID();
  await offlineDb.pendingTransactions.add({
    clientId,
    payload,
    status: "pending",
    createdAt: Date.now(),
  });
  return clientId;
}

export async function getPendingCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.pendingTransactions.where("status").equals("pending").count();
}

export function setupOfflineSyncListeners(): () => void {
  const handleOnline = () => {
    flushPendingTransactions();
  };

  window.addEventListener("online", handleOnline);

  if (navigator.onLine) {
    flushPendingTransactions();
  }

  return () => window.removeEventListener("online", handleOnline);
}
