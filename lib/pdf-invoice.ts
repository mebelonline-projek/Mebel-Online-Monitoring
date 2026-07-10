// ============================================================
// 🧾 PDF — Helper generate Nota & Faktur
// ============================================================

import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceData, InvoiceLineItem } from "@/components/invoice/invoice-document";

function formatIdDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

import { DEFAULT_LOGO } from "@/lib/store-logo";

function resolveLogoUrl(
  settingsLogo: string | null | undefined,
  request: Request
): string | null {
  if (settingsLogo) return settingsLogo;
  const origin = request.headers.get("origin") || request.headers.get("host") || "";
  const protocol = origin.includes("localhost") ? "http" : "https";
  const host = origin.includes("localhost") ? "localhost:3000" : origin;
  return `${protocol}://${host}${DEFAULT_LOGO}`;
}

export function mapTransactionLineItems(
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    note: string | null;
    sort_order: number;
  }> | null | undefined,
  fallback: { description: string | null; final_price: number }
): InvoiceLineItem[] {
  if (items && items.length > 0) {
    return [...items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        note: item.note,
      }));
  }

  return [
    {
      product_name: fallback.description || "Pesanan",
      quantity: 1,
      unit_price: fallback.final_price,
      line_total: fallback.final_price,
      note: null,
    },
  ];
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
      transaction_payments (*),
      transaction_items (*)
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
  const lineItems = mapTransactionLineItems(
    transaction.transaction_items as Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      note: string | null;
      sort_order: number;
    }> | null,
    { description: transaction.description, final_price: transaction.final_price }
  );

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
    productName: lineItems.map((i) => i.product_name).join(", "),
    productDescription: null,
    description: transaction.description || null,
    lineItems,
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
