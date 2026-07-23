import { GudangShell } from "@/components/inventory/gudang-shell";
import { getUserProfile } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function GudangLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "KARYAWAN") redirect("/kasir");

  return <GudangShell>{children}</GudangShell>;
}
