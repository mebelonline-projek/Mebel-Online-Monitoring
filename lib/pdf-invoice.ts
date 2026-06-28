// ============================================================
// 🧾 PDF — Helper generate Nota & Faktur
// ============================================================

import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceData } from "@/components/invoice/invoice-document";

function formatIdDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveLogoUrl(
  settingsLogo: string | null | undefined,
  request: Request
): string | null {
  if (settingsLogo) return settingsLogo;
  const origin = request.headers.get("origin") || request.headers.get("host") || "";
  const protocol = origin.includes("localhost") ? "http" : "https";
  const host = origin.includes("localhost") ? "localhost:3000" : origin;
  return `${protocol}://${host}/logo.webp`;
}

export async function buildNotaPdfData(
  supabase: SupabaseClient,
  transactionId: string,
  request: Request
): Promise<InvoiceData | null> {
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      *,
      transaction_payments (*)
    `)
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !transaction) return null;

  const { data: settings } = await supabase
    .from("store_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const payments = (transaction.transaction_payments || []) as Array<{
    amount: number;
    payment_date: string;
    method: string;
    note: string | null;
  }>;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = transaction.final_price - totalPaid;

  return {
    invoiceNumber: transaction.transaction_number,
    createdAt: formatIdDate(transaction.created_at),
    status: transaction.status,
    storeName: settings?.store_name || "Mebel Online Monitoring",
    storeAddress: settings?.address || null,
    storePhone: settings?.phone || null,
    storeLogoUrl: resolveLogoUrl(settings?.logo_url, request),
    customerName: transaction.customer_name || "—",
    customerPhone: null,
    customerAddress: null,
    productName: transaction.description || "—",
    productDescription: null,
    description: transaction.description || null,
    finalPrice: transaction.final_price,
    paymentType: transaction.payment_type,
    dpAmount: transaction.dp_amount || 0,
    totalPaid,
    remainingAmount,
    payments: payments.map((p) => ({
      amount: p.amount,
      date: formatIdDate(p.payment_date),
      method: p.method,
      note: p.note,
    })),
  };
}

export async function buildFakturPdfData(
  supabase: SupabaseClient,
  invoiceId: string,
  request: Request
): Promise<InvoiceData | null> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      invoice_items (
        transaction_id,
        transactions:transaction_id (
          id,
          transaction_number,
          description,
          final_price,
          status,
          transaction_payments (*)
        )
      )
    `)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !invoice) return null;

  const { data: settings } = await supabase
    .from("store_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  type TxRow = {
    transaction_number: string;
    description: string | null;
    final_price: number;
    transaction_payments?: Array<{
      amount: number;
      payment_date: string;
      method: string;
      note: string | null;
    }>;
  };

  const items = (invoice.invoice_items || []) as Array<{
    transactions: TxRow | null;
  }>;

  const transactions = items.map((i) => i.transactions).filter(Boolean) as TxRow[];
  const lineSummary = transactions
    .map((t) => `${t.transaction_number}${t.description ? ` — ${t.description}` : ""}`)
    .join("; ");

  const allPayments = transactions.flatMap((t) => t.transaction_payments || []);

  return {
    invoiceNumber: invoice.invoice_number,
    createdAt: formatIdDate(invoice.created_at),
    status: invoice.status,
    storeName: settings?.store_name || "Mebel Online Monitoring",
    storeAddress: settings?.address || null,
    storePhone: settings?.phone || null,
    storeLogoUrl: resolveLogoUrl(settings?.logo_url, request),
    customerName: invoice.customer_name || "—",
    customerPhone: null,
    customerAddress: null,
    productName:
      transactions.length > 1
        ? `Paket ${transactions.length} transaksi`
        : transactions[0]?.description || transactions[0]?.transaction_number || "—",
    productDescription: lineSummary || null,
    description: invoice.notes || null,
    finalPrice: invoice.total_amount,
    paymentType: invoice.remaining_amount <= 0 ? "CASH" : "DP",
    dpAmount: invoice.total_paid,
    totalPaid: invoice.total_paid,
    remainingAmount: invoice.remaining_amount,
    payments: allPayments.map((p) => ({
      amount: p.amount,
      date: formatIdDate(p.payment_date),
      method: p.method,
      note: p.note,
    })),
  };
}

export async function renderInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
  const ReactPDF = await import("@react-pdf/renderer");
  const { InvoiceDocument } = await import("@/components/invoice/invoice-document");

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(InvoiceDocument, { data }) as any
  );

  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
