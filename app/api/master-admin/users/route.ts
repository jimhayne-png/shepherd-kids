import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

const MASTER_ADMIN_EMAIL = "jim@gratefulconsultinggroup.com";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkMasterAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user?.email) return false;
  const masterAdminEnv = (process.env.MASTER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const ownerEmails = (process.env.OWNER_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const allowed = new Set([MASTER_ADMIN_EMAIL.toLowerCase(), masterAdminEnv, ...ownerEmails].filter(Boolean));
  return allowed.has(user.email.toLowerCase());
}

// ── GET — list all auth users with church attachment ─────────────────────────

export async function GET(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = adminClient();

  const [usersRes, cuRes, churchRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("church_users").select("user_id, church_id, role"),
    admin.from("churches").select("id, name"),
  ]);

  const churchMap = new Map(
    (churchRes.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
  );

  // user_id → first church found
  const userChurchMap = new Map<string, { id: string; name: string }>();
  for (const cu of cuRes.data ?? []) {
    if (!userChurchMap.has(cu.user_id)) {
      const name = churchMap.get(cu.church_id);
      if (name) userChurchMap.set(cu.user_id, { id: cu.church_id, name });
    }
  }

  const masterAdminEnv = (process.env.MASTER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const ownerEmails = new Set(
    (process.env.OWNER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );

  const masterEmails = new Set(
    [MASTER_ADMIN_EMAIL.toLowerCase(), masterAdminEnv].filter(Boolean)
  );

  const users = (usersRes.data?.users ?? []).map((u) => {
    const email = u.email?.toLowerCase() ?? "";
    const isMaster = masterEmails.has(email) || ownerEmails.has(email);
    return {
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      church: userChurchMap.get(u.id) ?? null,
      is_master_admin: isMaster,
    };
  });

  // Newest first
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return Response.json({ users });
}

// ── DELETE ?userId=xxx — permanently delete an orphaned auth user ─────────────

export async function DELETE(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required." }, { status: 400 });

  const admin = adminClient();

  // Safety: refuse deletion if this user is attached to any church
  const { data: cu } = await admin
    .from("church_users")
    .select("church_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cu) {
    return Response.json(
      { error: "Cannot delete a user who is attached to a church. Remove them from the church first." },
      { status: 409 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
