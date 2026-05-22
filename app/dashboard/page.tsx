import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log("server dashboard getUser:", {
    hasUser: !!user,
    error: error?.message ?? null,
  });

  if (!user) redirect("/");

  return <DashboardClient userId={user.id} userEmail={user.email ?? null} />;
}
