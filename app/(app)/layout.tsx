import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { ProfileLoader } from "@/components/layout/profile-loader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ProfileLoader>{children}</ProfileLoader>;
}
