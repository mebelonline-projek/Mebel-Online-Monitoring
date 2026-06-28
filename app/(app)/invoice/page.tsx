import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getInvoices } from "@/lib/transactions";
import { InvoiceListClient } from "@/components/invoice/invoice-list-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function InvoicePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "semua";
  const page = parseInt(params.page || "1", 10);

  const result = await getInvoices({ q, status, page, limit: 10 });

  return (
    <div className="p-4 md:p-8">
      <InvoiceListClient
        invoices={result.data || []}
        total={result.total || 0}
        currentPage={result.currentPage || 1}
        totalPages={result.totalPages || 1}
        query={q}
        statusFilter={status}
      />
    </div>
  );
}