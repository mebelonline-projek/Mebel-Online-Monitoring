import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface PiutangRow {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  final_price: number;
  status: string;
  created_at: string;
  paid: number;
  remaining: number;
}

export interface PiutangPageData {
  piutangList: PiutangRow[];
  totalPiutang: number;
}

export async function getPiutangPageData(): Promise<PiutangPageData> {
  const supabase = await createServerSupabaseClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, transaction_number, customer_name, final_price, status, created_at")
    .in("status", ["DP", "MENUNGGU_PELUNASAN"])
    .order("created_at", { ascending: false });

  const txIds = (transactions || []).map((t) => t.id);
  const { data: payments } = txIds.length
    ? await supabase
        .from("transaction_payments")
        .select("transaction_id, amount")
        .in("transaction_id", txIds)
    : { data: [] };

  const paidMap = new Map<string, number>();
  for (const p of payments || []) {
    paidMap.set(p.transaction_id, (paidMap.get(p.transaction_id) || 0) + p.amount);
  }

  const piutangList = (transactions || [])
    .map((tx) => {
      const paid = paidMap.get(tx.id) || 0;
      const remaining = tx.final_price - paid;
      return { ...tx, paid, remaining };
    })
    .filter((tx) => tx.remaining > 0);

  const totalPiutang = piutangList.reduce((sum, tx) => sum + tx.remaining, 0);

  return { piutangList, totalPiutang };
}
