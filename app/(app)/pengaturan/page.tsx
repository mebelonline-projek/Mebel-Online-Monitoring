// ============================================================
// ⚙️ PENGATURAN — Info Toko + Kelola User
// ============================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserProfile } from "@/lib/supabase-server";
import { getStoreSettings } from "@/lib/store-queries";
import { SettingsClient } from "./settings-client";

export default async function PengaturanPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  if (profile.role !== "OWNER") {
    redirect("/dashboard/karyawan");
  }

  const settings = await getStoreSettings();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola informasi toko, logo, dan user
        </p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/pengaturan"
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
        >
          Informasi Toko
        </Link>
        <Link
          href="/pengaturan/user"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border transition-colors"
        >
          Kelola User
        </Link>
      </div>

      <SettingsClient settings={settings} profileRole={profile.role} />
    </div>
  );
}