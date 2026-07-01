// ============================================================
// 📦 TRANSACTIONS — Server Actions
// ============================================================
// CRUD transaksi + invoice + dashboard stats
// ============================================================

"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache, revalidateTag } from "next/cache";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { transactionSchema, hppItemSchema, paymentSchema } from "@/lib/validation";
import type { ActionState } from "@/types/common";

// Helper: admin client (bypass RLS) untuk operasi write yang tidak bisa dilakukan Karyawan
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset di environment variables."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// Cache tag constants — digunakan untuk invalidasi
// ============================================================
const CACHE_TAGS = {
  dashboard: "dashboard",
  transactions: "transactions",
} as const;

// ============================================================
// Types
// ============================================================
export interface TransactionRow {
  id: string;
  transaction_number: string;
  customer_name: string | null;
  description: string | null;
  final_price: number;
  payment_type: "CASH" | "DP";
  dp_amount: number;
  status: "LUNAS" | "DP" | "MENUNGGU_PELUNASAN" | "BATAL";
  void_reason: string | null;
  created_by: string | null;
  void_by: string | null;
  created_at: string;
  updated_at: string;
  void_at: string | null;
}

export interface TransactionWithRelations extends TransactionRow {
  hpp_items?: Array<{ id: string; name: string; amount: number; note: string | null }>;
  transaction_payments?: Array<{ id: string; amount: number; payment_date: string; method: string; note: string | null }>;
}

export interface TransactionListParams {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// CREATE — Tambah transaksi
// ============================================================
export async function createTransaction(
  formData: z.infer<typeof transactionSchema>
): Promise<ActionState<{ id: string; transaction_number: string }>> {
  try {
    const parsed = transactionSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Anda harus login" };
    }

    const supabase = await createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, message: "Profile tidak ditemukan" };
    }

    const data = parsed.data;
    const isCash = data.payment_type === "CASH";
    const status = isCash ? "LUNAS" : "DP";

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        customer_name: data.customer_name || null,
        description: data.description || null,
        final_price: data.final_price,
        payment_type: data.payment_type,
        dp_amount: isCash ? data.final_price : data.dp_amount,
        status,
        created_by: user.id,
      })
      .select("id, transaction_number")
      .maybeSingle();

    if (txError) {
      return { success: false, message: txError.message };
    }
    if (!transaction) {
      return { success: false, message: "Gagal membuat transaksi" };
    }

    const paymentAmount = isCash ? data.final_price : data.dp_amount;
    const { error: payError } = await supabase
      .from("transaction_payments")
      .insert({
        transaction_id: transaction.id,
        amount: paymentAmount,
        method: "TUNAI",
        note: isCash ? "Pembayaran Lunas" : "Uang Muka (DP)",
        created_by: user.id,
      });

    if (payError) {
      await supabase.from("transactions").delete().eq("id", transaction.id);
      return { success: false, message: `Gagal membuat pembayaran: ${payError.message}` };
    }

    // Invalidate cache — immediate expiry
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });
    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: isCash
        ? `Transaksi ${transaction.transaction_number} berhasil dibuat (LUNAS)`
        : `Transaksi ${transaction.transaction_number} berhasil dibuat (DP Rp ${data.dp_amount.toLocaleString("id-ID")})`,
      data: { id: transaction.id, transaction_number: transaction.transaction_number },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat transaksi",
    };
  }
}

// ============================================================
// LIST — Daftar transaksi dengan filter + search + pagination
// ⚡ Cache 30 detik, invalidasi via revalidateTag("transactions")
// ============================================================
export const getTransactions = unstable_cache(
  async (params: TransactionListParams = {}) => {
    const supabase = await createServerSupabaseClient();
    const { q = "", status = "", page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("transactions")
      .select(`
        id,
        transaction_number,
        customer_name,
        description,
        final_price,
        payment_type,
        dp_amount,
        status,
        created_at,
        updated_at,
        void_reason
      `, { count: "exact" });

    if (status && status !== "semua") {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(
        `transaction_number.ilike.%${q}%,customer_name.ilike.%${q}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, message: error.message, data: [], total: 0, totalPages: 0 };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      success: true,
      data: (data || []) as unknown as TransactionWithRelations[],
      total: count || 0,
      totalPages,
      currentPage: page,
    };
  },
  ["transactions-list"],
  { revalidate: 30, tags: [CACHE_TAGS.transactions] }
);

// ============================================================
// GET BY ID — Detail transaksi
// ============================================================
export async function getTransactionById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        hpp_items (*),
        transaction_payments (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    return {
      success: true,
      data: data as unknown as TransactionWithRelations & {
        hpp_items: Array<{ id: string; name: string; amount: number; note: string | null }>;
        transaction_payments: Array<{ id: string; amount: number; payment_date: string; method: string; note: string | null }>;
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// UPDATE — Edit transaksi (hanya jika belum LUNAS/BATAL)
// ============================================================
export async function updateTransaction(
  id: string,
  formData: z.infer<typeof transactionSchema>
): Promise<ActionState<{ id: string; transaction_number: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: existing, error: checkError } = await supabase
      .from("transactions")
      .select("id, transaction_number, payment_type, status")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      return { success: false, message: checkError.message };
    }

    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    if (existing.status === "LUNAS" || existing.status === "BATAL") {
      return { success: false, message: "Transaksi sudah lunas atau batal, tidak bisa diedit" };
    }

    if (existing.status === "MENUNGGU_PELUNASAN") {
      return {
        success: false,
        message: "Transaksi sudah ada pelunasan, tidak bisa diedit. Batalkan dulu jika perlu koreksi.",
      };
    }

    const { data: existingPayments, error: payCheckError } = await supabase
      .from("transaction_payments")
      .select("id")
      .eq("transaction_id", id);

    if (payCheckError) {
      return { success: false, message: payCheckError.message };
    }

    if ((existingPayments || []).length > 1) {
      return {
        success: false,
        message: "Transaksi memiliki lebih dari satu pembayaran, tidak bisa diedit",
      };
    }

    const parsed = transactionSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const isCash = data.payment_type === "CASH";

    // Status: CASH → LUNAS. DP → tetap DP (belum ada pelunasan karena hanya 1 payment).
    const newStatus = isCash ? "LUNAS" : "DP";

    // Update transaksi
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        customer_name: data.customer_name || null,
        description: data.description || null,
        final_price: data.final_price,
        payment_type: data.payment_type,
        dp_amount: isCash ? data.final_price : data.dp_amount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    // Update initial payment amount — JANGAN hapus + buat ulang!
    const paymentAmount = isCash ? data.final_price : data.dp_amount;
    const existingPaymentsList = existingPayments || [];

    if (existingPaymentsList.length > 0) {
      const { error: payError } = await supabase
        .from("transaction_payments")
        .update({
          amount: paymentAmount,
          note: isCash ? "Pembayaran Lunas (edit)" : "Uang Muka (DP) — edit",
        })
        .eq("id", existingPaymentsList[0].id);

      if (payError) {
        return { success: false, message: `Gagal update pembayaran: ${payError.message}` };
      }
    } else {
      const { error: payError } = await supabase
        .from("transaction_payments")
        .insert({
          transaction_id: id,
          amount: paymentAmount,
          method: "TUNAI",
          note: isCash ? "Pembayaran Lunas (edit)" : "Uang Muka (DP) — edit",
          created_by: user.id,
        });

      if (payError) {
        return { success: false, message: `Gagal membuat pembayaran: ${payError.message}` };
      }
    }

    // Invalidate cache
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });
    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: `Transaksi ${existing.transaction_number} berhasil diupdate`,
      data: { id: id, transaction_number: existing.transaction_number },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// VOID — Soft delete (owner only)
// ============================================================
export async function voidTransaction(
  id: string,
  reason: string
): Promise<ActionState> {
  try {
    if (!reason || reason.trim().length < 3) {
      return { success: false, message: "Alasan pembatalan minimal 3 karakter" };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa membatalkan transaksi" };
    }

    const { data: existing, error: checkError } = await supabase
      .from("transactions")
      .select("status, transaction_number")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      return { success: false, message: checkError.message };
    }

    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    if (existing.status === "BATAL") {
      return { success: false, message: "Transaksi sudah dibatalkan" };
    }

    const { error: voidError } = await supabase
      .from("transactions")
      .update({
        status: "BATAL",
        void_reason: reason.trim(),
        void_by: user.id,
        void_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (voidError) {
      return { success: false, message: voidError.message };
    }

    // Invalidate cache
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });
    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: `Transaksi ${existing.transaction_number} berhasil dibatalkan`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// HAPUS PERMANEN — Hard delete (OWNER ONLY, semua status)
// ============================================================
export async function deleteTransactionPermanent(
  id: string
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus transaksi permanen" };
    }

    const { data: existing, error: checkError } = await supabase
      .from("transactions")
      .select("id, transaction_number")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      return { success: false, message: checkError.message };
    }

    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    // Cek apakah transaksi terikat invoice
    const { data: invoiceLinks, error: invCheckError } = await supabase
      .from("invoice_items")
      .select("id, invoice_id")
      .eq("transaction_id", id);

    if (invCheckError) {
      return { success: false, message: `Gagal cek invoice: ${invCheckError.message}` };
    }

    if (invoiceLinks && invoiceLinks.length > 0) {
      return {
        success: false,
        message: `Transaksi ${existing.transaction_number} terikat ke ${invoiceLinks.length} invoice. Hapus invoice terkait terlebih dahulu.`,
      };
    }

    await supabase.from("transaction_payments").delete().eq("transaction_id", id);
    await supabase.from("hpp_items").delete().eq("transaction_id", id);

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, message: deleteError.message };
    }

    // Invalidate cache
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });
    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: `Transaksi ${existing.transaction_number} berhasil dihapus permanen`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus transaksi",
    };
  }
}

// ============================================================
// HPP CRUD
// ============================================================
export async function addHppItem(
  formData: z.infer<typeof hppItemSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = hppItemSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("id, status, transaction_number")
      .eq("id", parsed.data.transaction_id)
      .maybeSingle();

    if (txError) {
      return { success: false, message: txError.message };
    }

    if (!tx) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    if (tx.status === "BATAL") {
      return { success: false, message: "Transaksi sudah dibatalkan" };
    }

    const { data: item, error } = await supabase
      .from("hpp_items")
      .insert({
        transaction_id: parsed.data.transaction_id,
        name: parsed.data.name,
        amount: parsed.data.amount,
        note: parsed.data.note || null,
        created_by: user.id,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }
    if (!item) {
      return { success: false, message: "Gagal menambahkan item HPP" };
    }

    // Invalidate cache — HPP mempengaruhi dashboard
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });

    return {
      success: true,
      message: `Item HPP "${parsed.data.name}" berhasil ditambahkan`,
      data: item,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menambah HPP",
    };
  }
}

export async function updateHppItem(
  id: string,
  formData: z.infer<typeof hppItemSchema>
): Promise<ActionState> {
  try {
    const parsed = hppItemSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: existing, error: checkError } = await supabase
      .from("hpp_items")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      return { success: false, message: checkError.message };
    }

    if (!existing) {
      return { success: false, message: "Item HPP tidak ditemukan" };
    }

    const { error } = await supabase
      .from("hpp_items")
      .update({
        name: parsed.data.name,
        amount: parsed.data.amount,
        note: parsed.data.note || null,
      })
      .eq("id", id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });

    return {
      success: true,
      message: `Item HPP "${parsed.data.name}" berhasil diupdate`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat update HPP",
    };
  }
}

export async function deleteHppItem(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("hpp_items")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });

    return {
      success: true,
      message: "Item HPP berhasil dihapus",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat hapus HPP",
    };
  }
}

// ============================================================
// PAYMENT — Input pelunasan
// ============================================================
export async function addPayment(
  formData: z.infer<typeof paymentSchema>
): Promise<ActionState<{ id: string }>> {
  try {
    const parsed = paymentSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();
    const transactionId = parsed.data.transaction_id;

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("id, status, final_price, payment_type, transaction_number")
      .eq("id", transactionId)
      .maybeSingle();

    if (txError) {
      return { success: false, message: txError.message };
    }

    if (!tx) {
      return { success: false, message: "Transaksi tidak ditemukan" };
    }

    if (tx.status === "LUNAS") {
      return { success: false, message: "Transaksi sudah lunas, tidak perlu pelunasan" };
    }

    if (tx.status === "BATAL") {
      return { success: false, message: "Transaksi sudah dibatalkan" };
    }

    const { data: existingPayments } = await supabase
      .from("transaction_payments")
      .select("amount")
      .eq("transaction_id", transactionId);

    const totalPaidBefore = (existingPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBefore = tx.final_price - totalPaidBefore;

    if (parsed.data.amount > remainingBefore) {
      return {
        success: false,
        message: `Jumlah pembayaran (Rp ${parsed.data.amount.toLocaleString("id-ID")}) melebihi sisa tagihan (Rp ${remainingBefore.toLocaleString("id-ID")})`,
      };
    }

    const { data: payment, error: payError } = await supabase
      .from("transaction_payments")
      .insert({
        transaction_id: transactionId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        note: parsed.data.note || null,
        created_by: user.id,
      })
      .select("id")
      .maybeSingle();

    if (payError) {
      return { success: false, message: payError.message };
    }
    if (!payment) {
      return { success: false, message: "Gagal menambahkan pembayaran" };
    }

    const totalPaidAfter = totalPaidBefore + parsed.data.amount;
    const remainingAfter = tx.final_price - totalPaidAfter;

    let newStatus: string;
    if (remainingAfter <= 0) {
      newStatus = "LUNAS";
    } else if (tx.status === "DP" && totalPaidAfter > 0) {
      newStatus = "MENUNGGU_PELUNASAN";
    } else {
      newStatus = tx.status;
    }

    if (newStatus !== tx.status) {
      await supabase
        .from("transactions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", transactionId);
    }

    // ── Auto-sync invoice totals (OPTIMIZED) ──
    // ⚡ Batch: ambil semua data dalam 4 query, aggregate di JS, update parallel
    const { data: linkedItems } = await supabase
      .from("invoice_items")
      .select("invoice_id")
      .eq("transaction_id", transactionId);

    if (linkedItems && linkedItems.length > 0) {
      const invoiceIds = [...new Set(linkedItems.map((i) => i.invoice_id))];

      const { data: allInvoiceItems } = await supabase
        .from("invoice_items")
        .select("invoice_id, transaction_id")
        .in("invoice_id", invoiceIds);

      if (allInvoiceItems && allInvoiceItems.length > 0) {
        const allTxIds = [...new Set(allInvoiceItems.map((i) => i.transaction_id))];

        const { data: allPayments } = await supabase
          .from("transaction_payments")
          .select("amount, transaction_id")
          .in("transaction_id", allTxIds);

        const { data: allInvoices } = await supabase
          .from("invoices")
          .select("id, total_amount")
          .in("id", invoiceIds);

        if (allInvoices && allInvoices.length > 0) {
          // Aggregate total_paid per invoice di JS
          const paidByInvoice = new Map<string, number>();
          for (const item of allInvoiceItems) {
            const txPayments = (allPayments || []).filter(
              (p) => p.transaction_id === item.transaction_id
            );
            const total = txPayments.reduce((s, p) => s + (p.amount || 0), 0);
            paidByInvoice.set(
              item.invoice_id,
              (paidByInvoice.get(item.invoice_id) || 0) + total
            );
          }

          // Parallel update semua invoice
          await Promise.all(
            allInvoices.map((inv) => {
              const syncedPaid = paidByInvoice.get(inv.id) || 0;
              const syncedRemaining = inv.total_amount - syncedPaid;
              return supabase
                .from("invoices")
                .update({
                  total_paid: syncedPaid,
                  remaining_amount: syncedRemaining,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", inv.id);
            })
          );
        }
      }
    }

    // Invalidate cache
    revalidateTag(CACHE_TAGS.dashboard, { expire: 0 });
    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    const statusMsg = newStatus === "LUNAS" ? " — LUNAS ✅" : "";

    return {
      success: true,
      message: `Pembayaran Rp ${parsed.data.amount.toLocaleString("id-ID")} berhasil dicatat${statusMsg}`,
      data: { id: payment.id },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menambah pembayaran",
    };
  }
}

// ============================================================
// INVOICE CRUD
// ============================================================

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  total_amount: number;
  total_paid: number;
  remaining_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: Array<{
    id: string;
    transaction_id: string;
    transactions?: {
      id: string;
      transaction_number: string;
      final_price: number;
      status: string;
      payment_type: string;
      dp_amount: number;
    } | null;
  }>;
}

export async function createInvoice(data: {
  customer_name?: string;
  transaction_ids: string[];
  notes?: string;
}): Promise<ActionState<{ id: string; invoice_number: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    if (!data.transaction_ids || data.transaction_ids.length === 0) {
      return { success: false, message: "Pilih minimal 1 transaksi" };
    }

    const { data: existingLinks, error: linkErr } = await supabase
      .from("invoice_items")
      .select("transaction_id")
      .in("transaction_id", data.transaction_ids);

    if (linkErr) {
      return { success: false, message: linkErr.message };
    }

    if (existingLinks && existingLinks.length > 0) {
      return {
        success: false,
        message: `${existingLinks.length} transaksi sudah terikat ke invoice lain. Hapus dari invoice lama terlebih dahulu.`,
      };
    }

    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select("id, final_price, status")
      .in("id", data.transaction_ids);

    if (txErr) return { success: false, message: txErr.message };
    if (!txs || txs.length === 0) return { success: false, message: "Transaksi tidak ditemukan" };

    const invalidTx = txs.filter((t) => t.status === "BATAL");
    if (invalidTx.length > 0) {
      return { success: false, message: "Tidak bisa membuat invoice dari transaksi yang dibatalkan" };
    }

    const totalAmount = txs.reduce((sum, t) => sum + t.final_price, 0);

    const { data: payments } = await supabase
      .from("transaction_payments")
      .select("amount")
      .in("transaction_id", data.transaction_ids);

    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - totalPaid;

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        customer_name: data.customer_name || null,
        total_amount: totalAmount,
        total_paid: totalPaid,
        remaining_amount: remaining,
        notes: data.notes || null,
        created_by: user.id,
      })
      .select("id, invoice_number")
      .maybeSingle();

    if (invErr) return { success: false, message: invErr.message };
    if (!invoice) return { success: false, message: "Gagal membuat invoice" };

    const items = data.transaction_ids.map((txId) => ({
      invoice_id: invoice.id,
      transaction_id: txId,
    }));

    const { error: itemErr } = await supabase.from("invoice_items").insert(items);
    if (itemErr) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return { success: false, message: `Gagal menambahkan item invoice: ${itemErr.message}` };
    }

    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} berhasil dibuat`,
      data: { id: invoice.id, invoice_number: invoice.invoice_number },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat invoice",
    };
  }
}

export async function getInvoices(params: { q?: string; status?: string; page?: number; limit?: number } = {}) {
  try {
    const supabase = await createServerSupabaseClient();
    const { q = "", status = "", page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        customer_name,
        status,
        total_amount,
        total_paid,
        remaining_amount,
        notes,
        created_by,
        created_at,
        updated_at
      `, { count: "exact" });

    if (status && status !== "semua") {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, message: error.message, data: [], total: 0, totalPages: 0 };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      success: true,
      data: (data || []) as unknown as InvoiceRow[],
      total: count || 0,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

export async function getInvoiceById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        customer_name,
        status,
        total_amount,
        total_paid,
        remaining_amount,
        notes,
        created_by,
        created_at,
        updated_at,
        invoice_items (
          id,
          transaction_id,
          transactions:transaction_id (id, transaction_number, final_price, status, payment_type, dp_amount)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) return { success: false, message: error.message };

    if (!data) return { success: false, message: "Invoice tidak ditemukan" };

    return { success: true, data: data as unknown as InvoiceRow };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

export async function deleteInvoice(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus invoice" };
    }

    const { data: existing } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("id", id)
      .maybeSingle();

    if (!existing) return { success: false, message: "Invoice tidak ditemukan" };

    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidateTag(CACHE_TAGS.transactions, { expire: 0 });

    return {
      success: true,
      message: `Invoice ${existing.invoice_number} berhasil dihapus`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus invoice",
    };
  }
}

// ============================================================
// DASHBOARD STATS — Aggregasi data keuangan
// ============================================================
// ⚡ Batch-fetch: 3-4 query total, aggregate di JS — bukan N+1.
// 🎯 KPI = periode AKTIF saja (hari ini / minggu ini / bulan ini / tahun ini)
//    Prev = periode SEBELUMNYA (kemarin / minggu lalu / bulan lalu / tahun lalu)
//    Chart = rentang penuh (30h / 12w / 12m / 5y)
//
// 🗂️ Cache: unstable_cache 5 menit, invalidate via revalidateTag("dashboard")
// ============================================================

export interface DashboardMonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  operationalCosts: number;
  netProfit: number;
  txCount: number;
}

export type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

export interface DashboardStats {
  revenue: number;
  hpp: number;
  grossProfit: number;
  operationalCosts: number;
  netProfit: number;
  netMargin: number;
  txCount: number;
  prevRevenue: number;
  prevGrossProfit: number;
  prevNetProfit: number;
  prevNetMargin: number;
  revenueTrend: number;
  grossProfitTrend: number;
  netProfitTrend: number;
  netMarginTrend: number;
  monthlyData: DashboardMonthlyData[];
  recentTransactions: Array<{
    id: string;
    transaction_number: string;
    final_price: number;
    status: string;
    created_at: string;
    customer_name: string;
  }>;
}

// ── Date helpers ──
function fmtDateISO(d: Date): string { return d.toISOString(); }
function fmtDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dayStart(d: Date): Date { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function dayEnd(d: Date): Date { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; }

// ── Batch: ambil semua data chart dalam 3-4 query ──
async function fetchChartRawData(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  chartStart: Date,
  chartEnd: Date
) {
  const { data: allPayments } = await supabase
    .from("transaction_payments")
    .select("amount, transaction_id, payment_date, transactions!inner(status)")
    .gte("payment_date", fmtDateISO(chartStart))
    .lte("payment_date", fmtDateISO(chartEnd));

  const { data: allTx } = await supabase
    .from("transactions")
    .select("id, status, created_at")
    .gte("created_at", fmtDateISO(chartStart))
    .lte("created_at", fmtDateISO(chartEnd));

  const validTxIds = (allTx || []).filter((t) => t.status !== "BATAL").map((t) => t.id);
  const allHpp = validTxIds.length > 0
    ? ((await supabase
        .from("hpp_items")
        .select("amount, transaction_id")
        .in("transaction_id", validTxIds)
      ).data || [])
    : [];

  const { data: allOpCosts } = await supabase
    .from("operational_costs")
    .select("amount, period_start, period_end")
    .lte("period_start", fmtDateOnly(chartEnd))
    .gte("period_end", fmtDateOnly(chartStart));

  return { allPayments: allPayments || [], allTx: allTx || [], allHpp, allOpCosts: allOpCosts || [] };
}

// ── Aggregate pure JS (no DB calls) ──

function aggregatePaymentsInRange(
  payments: Array<{ amount: number; transaction_id: string; payment_date: string; transactions: unknown }>,
  rangeStart: Date,
  rangeEnd: Date
): { revenue: number; txIds: string[] } {
  const rStart = rangeStart.getTime();
  const rEnd = rangeEnd.getTime();
  const valid = payments.filter((p) => {
    const d = new Date(p.payment_date).getTime();
    if (d < rStart || d > rEnd) return false;
    const tx = p.transactions;
    const status = Array.isArray(tx)
      ? (tx[0] as { status: string } | undefined)?.status
      : (tx as { status: string } | null)?.status;
    return status !== "BATAL";
  });
  const revenue = valid.reduce((s, p) => s + (p.amount || 0), 0);
  const txIds = [...new Set(valid.map((p) => p.transaction_id))];
  return { revenue, txIds };
}

function sumHppForBatch(
  hppItems: Array<{ amount: number; transaction_id: string }>,
  txIds: Set<string>
): number {
  return hppItems.filter((h) => txIds.has(h.transaction_id)).reduce((s, h) => s + (h.amount || 0), 0);
}

function aggregateOpCostsInRange(
  opCosts: Array<{ amount: number; period_start: string; period_end: string }>,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const rStart = rangeStart.getTime();
  const rEnd = rangeEnd.getTime();
  return opCosts.filter((op) => {
    const ps = new Date(op.period_start).getTime();
    const pe = new Date(op.period_end).getTime();
    return ps <= rEnd && pe >= rStart;
  }).reduce((s, op) => s + (op.amount || 0), 0);
}

function countTxInRange(
  allTx: Array<{ id: string; status: string; created_at: string }>,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const rStart = rangeStart.getTime();
  const rEnd = rangeEnd.getTime();
  return allTx.filter((t) => {
    if (t.status === "BATAL") return false;
    const d = new Date(t.created_at).getTime();
    return d >= rStart && d <= rEnd;
  }).length;
}

interface PeriodStat {
  revenue: number; hpp: number; grossProfit: number;
  operationalCosts: number; netProfit: number; netMargin: number; txCount: number;
}

function computePeriodStat(
  payments: Array<{ amount: number; transaction_id: string; payment_date: string; transactions: unknown }>,
  hppItems: Array<{ amount: number; transaction_id: string }>,
  opCosts: Array<{ amount: number; period_start: string; period_end: string }>,
  allTx: Array<{ id: string; status: string; created_at: string }>,
  rangeStart: Date,
  rangeEnd: Date
): PeriodStat {
  const { revenue, txIds } = aggregatePaymentsInRange(payments, rangeStart, rangeEnd);
  const txIdSet = new Set(txIds);
  const hpp = sumHppForBatch(hppItems, txIdSet);
  const grossProfit = revenue - hpp;
  const operationalCosts = aggregateOpCostsInRange(opCosts, rangeStart, rangeEnd);
  const netProfit = grossProfit - operationalCosts;
  const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;
  const txCount = countTxInRange(allTx, rangeStart, rangeEnd);
  return { revenue, hpp, grossProfit, operationalCosts, netProfit, netMargin, txCount };
}

// ── Core dashboard logic (tanpa Supabase client di wrapper) ──
async function computeDashboardStats(period: PeriodType): Promise<DashboardStats> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  // ── 1. Tentukan: KPI (1 unit), Prev (1 unit), Chart (rentang penuh) ──
  let kpiStart: Date, kpiEnd: Date;
  let prevStart: Date, prevEnd: Date;
  let chartStart: Date, chartEnd: Date;

  if (period === "daily") {
    kpiStart = dayStart(now);
    kpiEnd = dayEnd(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    prevStart = dayStart(yesterday);
    prevEnd = dayEnd(yesterday);
    chartStart = new Date(now);
    chartStart.setDate(chartStart.getDate() - 29);
    chartStart.setHours(0, 0, 0, 0);
    chartEnd = dayEnd(now);
  } else if (period === "weekly") {
    const currDay = now.getDay();
    const monOffset = currDay === 0 ? -6 : 1 - currDay;
    kpiStart = new Date(now);
    kpiStart.setDate(kpiStart.getDate() + monOffset);
    kpiStart.setHours(0, 0, 0, 0);
    kpiEnd = new Date(kpiStart);
    kpiEnd.setDate(kpiEnd.getDate() + 6);
    kpiEnd.setHours(23, 59, 59, 999);
    prevStart = new Date(kpiStart);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(kpiEnd);
    prevEnd.setDate(prevEnd.getDate() - 7);
    chartStart = new Date(kpiStart);
    chartStart.setDate(chartStart.getDate() - 77);
    chartEnd = kpiEnd;
  } else if (period === "monthly") {
    kpiStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    kpiEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0);
    chartEnd = kpiEnd;
  } else {
    kpiStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    kpiEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    chartStart = new Date(now.getFullYear() - 4, 0, 1, 0, 0, 0);
    chartEnd = kpiEnd;
  }

  // ── 2. Fetch SEMUA data dalam SATU batch ──
  const { allPayments, allTx, allHpp, allOpCosts } = await fetchChartRawData(
    supabase, chartStart, chartEnd
  );

  // ── 3. Hitung KPI & Prev ──
  const kpi = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, kpiStart, kpiEnd);
  const prev = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, prevStart, prevEnd);

  const calcTrend = (curr: number, prevVal: number): number => {
    if (prevVal === 0 && curr === 0) return 0;
    if (prevVal === 0) return 100;
    return Math.round(((curr - prevVal) / prevVal) * 1000) / 10;
  };

  const revenueTrend = calcTrend(kpi.revenue, prev.revenue);
  const grossProfitTrend = calcTrend(kpi.grossProfit, prev.grossProfit);
  const netProfitTrend = calcTrend(kpi.netProfit, prev.netProfit);
  const netMarginTrend = Math.round((kpi.netMargin - prev.netMargin) * 10) / 10;

  // ── 4. Build chart data (monthlyData) pakai batch, bukan DB query ──
  const monthlyData: DashboardMonthlyData[] = [];
  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  if (period === "daily") {
    for (let d = 29; d >= 0; d--) {
      const ds = new Date(now);
      ds.setDate(ds.getDate() - d);
      const s = dayStart(ds);
      const e = dayEnd(ds);
      const stat = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, s, e);
      monthlyData.push({
        month: fmtDateOnly(s),
        monthLabel: `${dayLabels[ds.getDay()]} ${ds.getDate()}/${ds.getMonth() + 1}`,
        revenue: stat.revenue, hpp: stat.hpp, grossProfit: stat.grossProfit,
        operationalCosts: stat.operationalCosts, netProfit: stat.netProfit, txCount: stat.txCount,
      });
    }
  } else if (period === "weekly") {
    const currDay = now.getDay();
    const monOffset = currDay === 0 ? -6 : 1 - currDay;
    for (let w = 11; w >= 0; w--) {
      const ws = new Date(now);
      ws.setDate(ws.getDate() + monOffset - w * 7);
      const s = dayStart(ws);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      const stat = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, s, e);
      monthlyData.push({
        month: `W${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`,
        monthLabel: `${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}`,
        revenue: stat.revenue, hpp: stat.hpp, grossProfit: stat.grossProfit,
        operationalCosts: stat.operationalCosts, netProfit: stat.netProfit, txCount: stat.txCount,
      });
    }
  } else if (period === "monthly") {
    for (let m = 0; m < 12; m++) {
      const s = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1, 0, 0, 0);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999);
      const stat = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, s, e);
      monthlyData.push({
        month: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`,
        monthLabel: `${monthLabels[s.getMonth()]} ${s.getFullYear()}`,
        revenue: stat.revenue, hpp: stat.hpp, grossProfit: stat.grossProfit,
        operationalCosts: stat.operationalCosts, netProfit: stat.netProfit, txCount: stat.txCount,
      });
    }
  } else {
    for (let y = 4; y >= 0; y--) {
      const year = now.getFullYear() - y;
      const s = new Date(year, 0, 1, 0, 0, 0);
      const e = new Date(year, 11, 31, 23, 59, 59, 999);
      const stat = computePeriodStat(allPayments, allHpp, allOpCosts, allTx, s, e);
      monthlyData.push({
        month: `${year}`, monthLabel: `${year}`,
        revenue: stat.revenue, hpp: stat.hpp, grossProfit: stat.grossProfit,
        operationalCosts: stat.operationalCosts, netProfit: stat.netProfit, txCount: stat.txCount,
      });
    }
  }

  // ── 5. Recent transactions ──
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("id, transaction_number, customer_name, final_price, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    revenue: kpi.revenue,
    hpp: kpi.hpp,
    grossProfit: kpi.grossProfit,
    operationalCosts: kpi.operationalCosts,
    netProfit: kpi.netProfit,
    netMargin: kpi.netMargin,
    txCount: kpi.txCount,
    prevRevenue: prev.revenue,
    prevGrossProfit: prev.grossProfit,
    prevNetProfit: prev.netProfit,
    prevNetMargin: prev.netMargin,
    revenueTrend,
    grossProfitTrend,
    netProfitTrend,
    netMarginTrend,
    monthlyData,
    recentTransactions: (recentTx || []).map((tx) => ({
      id: tx.id,
      transaction_number: tx.transaction_number,
      final_price: tx.final_price,
      status: tx.status,
      created_at: tx.created_at,
      customer_name: tx.customer_name || "—",
    })),
  };
}

// ⚡ Cached wrapper — 5 menit TTL, invalidasi via revalidateTag("dashboard")
export const getDashboardStats = unstable_cache(
  computeDashboardStats,
  ["dashboard-stats"],
  { revalidate: 300, tags: [CACHE_TAGS.dashboard] }
);