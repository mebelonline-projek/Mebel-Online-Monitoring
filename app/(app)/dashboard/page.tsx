import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  if (profile.role === "OWNER") {
    redirect("/dashboard/owner");
  }
  if (profile.role === "KARYAWAN") {
    redirect("/dashboard/karyawan");
  }
  if (profile.role === "GUDANG") {
    redirect("/gudang/stok");
  }

  redirect("/login");
}