// ============================================================
// 🧾 API — Generate Faktur Invoice PDF
// ============================================================
// GET /api/invoice/[id] — id = invoice UUID (tabel invoices)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { buildFakturPdfData, renderInvoicePdfBuffer } from "@/lib/pdf-invoice";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const pdfData = await buildFakturPdfData(supabase, id, request);

    if (!pdfData) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
    }

    const pdfBuffer = await renderInvoicePdfBuffer(pdfData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="INV-${pdfData.invoiceNumber}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal generate invoice PDF" }, { status: 500 });
  }
}
