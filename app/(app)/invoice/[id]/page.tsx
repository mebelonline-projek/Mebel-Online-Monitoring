import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getInvoiceById } from "@/lib/transactions";
import { getStoreSettings } from "@/lib/store-queries";
import { InvoiceDetailClient } from "@/components/invoice/invoice-detail-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const result = await getInvoiceById(id);

  if (!result.success || !result.data) notFound();

  const settings = await getStoreSettings();

  return (
    <div className="p-4 md:p-8">
      <InvoiceDetailClient invoice={result.data} profileRole={profile.role} storeSettings={settings} />
    </div>
  );
}