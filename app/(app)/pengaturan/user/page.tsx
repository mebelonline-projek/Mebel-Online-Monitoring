import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase-server";
import { getUsers } from "@/lib/users";
import { UserManagementClient } from "./user-management-client";

export default async function UserManagementPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  if (profile.role !== "OWNER") {
    if (profile.role === "GUDANG") redirect("/gudang/stok");
    redirect("/dashboard/karyawan");
  }

  const users = await getUsers();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <UserManagementClient users={users} currentUserId={profile.id} />
    </div>
  );
}