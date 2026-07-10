"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flushPendingTransactions, getPendingCount } from "@/lib/offline-sync";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      setPendingCount(await getPendingCount());
    };

    updateStatus();

    const onOnline = () => updateStatus();
    const onOffline = () => updateStatus();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const interval = setInterval(updateStatus, 10000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await flushPendingTransactions();
    setPendingCount(await getPendingCount());
    setIsSyncing(false);
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-sm ${
        isOnline
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-b border-amber-500/30"
          : "bg-destructive/15 text-destructive border-b border-destructive/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          {!isOnline
            ? "Offline — transaksi akan disimpan lokal dan disinkronkan otomatis"
            : `${pendingCount} transaksi menunggu sinkronisasi`}
        </span>
      </div>
      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs shrink-0"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
          Sync
        </Button>
      )}
    </div>
  );
}
