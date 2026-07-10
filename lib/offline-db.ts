import Dexie, { type EntityTable } from "dexie";

export interface PendingTransaction {
  clientId: string;
  payload: {
    client_id?: string;
    customer_id?: string;
    product_id?: string;
    customer_name: string | null;
    description: string | null;
    final_price: number;
    payment_type: "CASH" | "DP";
    payment_method?: "TUNAI" | "TRANSFER";
    dp_amount: number;
    items?: Array<{
      product_id?: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      note?: string;
    }>;
  };
  status: "pending" | "syncing" | "synced" | "failed";
  errorMessage?: string;
  createdAt: number;
}

export interface CachedTransaction {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  status: string;
  created_at: string;
  cachedAt: number;
}

export interface CachedNota {
  transactionId: string;
  html: string;
  cachedAt: number;
}

class OfflineDatabase extends Dexie {
  pendingTransactions!: EntityTable<PendingTransaction, "clientId">;
  cachedTransactions!: EntityTable<CachedTransaction, "id">;
  cachedNotas!: EntityTable<CachedNota, "transactionId">;

  constructor() {
    super("MebelMonitorOffline");
    this.version(1).stores({
      pendingTransactions: "clientId, status, createdAt",
      cachedTransactions: "id, cachedAt",
    });
    this.version(2).stores({
      pendingTransactions: "clientId, status, createdAt",
      cachedTransactions: "id, cachedAt",
      cachedNotas: "transactionId, cachedAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new OfflineDatabase() : null;
