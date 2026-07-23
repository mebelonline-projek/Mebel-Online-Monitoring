import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getStoreSettings } from "@/lib/store-queries";
import { AdminLayout } from "@/components/layout/admin-layout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, settings] = await Promise.all([
    getUserProfile(),
    getStoreSettings(),
  ]);

  if (!profile) redirect("/login");

  const store = {
    store_name: settings?.store_name || "Mebel Online",
    logo_url: settings?.logo_url ?? null,
  };

  return (
    <AdminLayout profile={profile} initialStore={store}>
      {children}
    </AdminLayout>
  );
}
