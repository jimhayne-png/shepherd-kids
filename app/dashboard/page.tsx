import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/api-auth";
import DashboardClient from "./DashboardClient";

type Church = { id: string; name: string };

const MASTER_ADMIN_EMAIL = "jim@gratefulconsultinggroup.com";

function isMasterAdmin(email: string | null | undefined) {
  const masterAdminEnv = (process.env.MASTER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const ownerEmails = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set([MASTER_ADMIN_EMAIL, masterAdminEnv, ...ownerEmails].filter(Boolean))
    .has((email ?? "").toLowerCase());
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const params = await searchParams;
  const admin = adminClient();

  if (isMasterAdmin(user.email)) {
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