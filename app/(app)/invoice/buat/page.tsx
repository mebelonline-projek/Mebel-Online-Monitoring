import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export const dynamic = "force-dynamic";

export default async function BuatInvoicePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  return (
    <div className="p-4 md:p-8">
      <InvoiceForm />
    </div>
  );
}