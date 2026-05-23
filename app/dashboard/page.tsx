import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/api-auth";
import DashboardClient from "./DashboardClient";

type Church = { id: string; name: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("server dashboard getUser:", {
    hasUser: !!user,
  });

  if (!user) redirect("/");

  const params = await searchParams;
  const admin = adminClient();

  const { data: adminRow } = await admin
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRow) {
    const selectedChurchId =
      typeof params.churchId === "string" ? params.churchId : null;

    if (selectedChurchId) {
      const { data: churchData } = await admin
        .from("churches")
        .select("id, name")
        .eq("id", selectedChurchId)
        .maybeSingle();

      if (churchData) {
        return (
          <DashboardClient
            userId={user.id}
            userEmail={user.email ?? null}
            churchId={churchData.id}
            churchName={churchData.name}
            isPlatformAdmin
            allChurches={[]}
          />
        );
      }
    }

    const { data: churches } = await admin
      .from("churches")
      .select("id, name")
      .order("name");

    return (
      <DashboardClient
        userId={user.id}
        userEmail={user.email ?? null}
        churchId={null}
        churchName={null}
        isPlatformAdmin
        allChurches={(churches ?? []) as Church[]}
      />
    );
  }

  // Normal church user
  const { data: churchUsers } = await admin
    .from("church_users")
    .select("church_id, churches(name)")
    .eq("user_id", user.id)
    .limit(1);

  const churchUser = (churchUsers ?? [])[0] ?? null;
  if (!churchUser) redirect("/onboarding");

  const churchName =
    (churchUser.churches as unknown as { name: string } | null)?.name ?? null;

  return (
    <DashboardClient
      userId={user.id}
      userEmail={user.email ?? null}
      churchId={churchUser.church_id}
      churchName={churchName}
      isPlatformAdmin={false}
      allChurches={[]}
    />
  );
}
