import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { getUsers } from "@/lib/users";
import { UserManagementClient } from "./user-management-client";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  // Hanya Owner yang bisa akses
  if (profile.role !== "OWNER") {
    redirect("/dashboard/karyawan");
  }

  const users = await getUsers();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <UserManagementClient users={users} currentUserId={user.id} />
    </div>
  );
}