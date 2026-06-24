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
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set([MASTER_ADMIN_EMAIL.toLowerCase(), masterAdminEnv, ...ownerEmails].filter(Boolean));
  return allowed.has(user.email.toLowerCase());
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(admin: ReturnType<typeof adminClient>, base: string): Promise<string> {
  const { data } = await admin.from("churches").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const DEFAULT_DEPARTMENTS = [
  { name: "General",              description: "All church members",                               color: "#1A4A2E", icon: "⛪" },
  { name: "Choir & Worship",      description: "Worship team and choir members",                   color: "#7C3AED", icon: "🎵" },
  { name: "Youth Group",          description: "Teen ministry ages 13-17",                         color: "#F59E0B", icon: "⚡" },
  { name: "Children's Ministry",  description: "Children ages 12 and under",                      color: "#EC4899", icon: "🌟" },
  { name: "Men's Ministry",       description: "Men's fellowship and discipleship",                color: "#2563EB", icon: "🔥" },
  { name: "Women's Ministry",     description: "Women's fellowship and discipleship",              color: "#DB2777", icon: "❤️" },
  { name: "Young Adults",         description: "Young adults ages 18-35",                         color: "#059669", icon: "🌱" },
  { name: "Ushers & Greeters",    description: "Welcome and hospitality team",                    color: "#D97706", icon: "🤝" },
  { name: "Prayer Team",          description: "Intercessory prayer ministry",                    color: "#0891B2", icon: "🙏" },
  { name: "Volunteers",           description: "General church volunteers",                       color: "#65A30D", icon: "⭐" },
  { name: "Senior Ministry",      description: "Ministry for senior members",                     color: "#6366F1", icon: "🕊️" },
  { name: "Sunday School Teachers",description: "Teachers and leaders for Sunday school",         color: "#0EA5E9", icon: "📖" },
  { name: "Missions",             description: "Outreach and missionary programs",                color: "#DC2626", icon: "🌍" },
  { name: "Bible Study Groups",   description: "Small group Bible study and discipleship",        color: "#7C2D12", icon: "📚" },
];

// ── GET — list all churches with their admin user ────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = adminClient();

  const [churchRes, cuRes, usersRes] = await Promise.all([
    admin
      .from("churches")
      .select("id, name, city, state, email, phone, subscription_status, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    admin.from("church_users").select("church_id, user_id, role").eq("role", "admin"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (churchRes.error) {
    return Response.json({ error: churchRes.error.message }, { status: 500 });
  }

  const userMap = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, { email: u.email ?? null, created_at: u.created_at }])
  );

  // Map church_id → first admin's user info
  const adminMap = new Map<string, { userId: string; email: string | null }>();
  for (const cu of cuRes.data ?? []) {
    if (!adminMap.has(cu.church_id)) {
      const u = userMap.get(cu.user_id);
      adminMap.set(cu.church_id, { userId: cu.user_id, email: u?.email ?? null });
    }
  }

  const churches = (churchRes.data ?? []).map((c) => ({
    ...c,
    admin: adminMap.get(c.id) ?? null,
  }));

  return Response.json({ churches });
}

// ── POST — create church + admin user ────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const churchName   = typeof body?.churchName   === "string" ? body.churchName.trim()   : "";
  const city         = typeof body?.city         === "string" ? body.city.trim()         : "";
  const state        = typeof body?.state        === "string" ? body.state.trim()        : "";
  const adminFirst   = typeof body?.adminFirst   === "string" ? body.adminFirst.trim()   : "";
  const adminLast    = typeof body?.adminLast    === "string" ? body.adminLast.trim()    : "";
  const adminEmail   = typeof body?.adminEmail   === "string" ? body.adminEmail.trim().toLowerCase() : "";
  const phone        = typeof body?.phone        === "string" ? body.phone.trim()        : "";

  if (!churchName) return Response.json({ error: "Church name is required." }, { status: 400 });
  if (!adminEmail) return Response.json({ error: "Admin email is required." }, { status: 400 });

  const admin = adminClient();

  // 1. Ensure the admin user exists (create if new)
  let userId: string;

  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = (existingUsers?.users ?? []).find(
    (u) => u.email?.toLowerCase() === adminEmail
  );

  let inviteLink: string | null = null;

  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      user_metadata: {
        first_name: adminFirst || undefined,
        last_name: adminLast || undefined,
      },
    });
    if (createErr || !created?.user) {
      return Response.json({ error: createErr?.message ?? "Failed to create user." }, { status: 500 });
    }
    userId = created.user.id;

    // Generate password-set link so the admin can share it.
    // redirectTo must point at /auth/callback so the token is exchanged for
    // a session, and next=/auth/reset-password tells the callback where to
    // send the user afterwards.
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: adminEmail,
      options: {
        redirectTo: `${baseUrl}/auth/confirm`,
      },
    });
    inviteLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link ?? null;
  }

  // 2. Generate unique slug
  const namePart = slugify(churchName);
  const cityPart = city ? slugify(city) : "";
  const baseSlug = cityPart ? `${namePart}-${cityPart}` : namePart;
  const slug = await uniqueSlug(admin, baseSlug);

  // 3. Create church with 14-day trial
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: church, error: churchErr } = await admin
    .from("churches")
    .insert({
      name: churchName,
      slug,
      email: adminEmail,
      phone: phone || null,
      city: city || null,
      state: state || null,
      subscription_status: "trial",
      trial_ends_at: trialEndsAt,
      qr_checkin_enabled: false,
    })
    .select("id")
    .single();

  if (churchErr) {
    return Response.json({ error: churchErr.message }, { status: 500 });
  }

  // 4. Link user to church as admin
  const { error: cuErr } = await admin.from("church_users").insert({
    church_id: church.id,
    user_id: userId,
    role: "admin",
  });
  if (cuErr) {
    return Response.json({ error: cuErr.message }, { status: 500 });
  }

  // 5. Default departments (non-fatal if this fails)
  await admin.from("departments").insert(
    DEFAULT_DEPARTMENTS.map((d) => ({ ...d, church_id: church.id }))
  );

  return Response.json({ success: true, church_id: church.id, invite_link: inviteLink });
}

// ── PATCH — deactivate / reactivate / get impersonate link ───────────────────

export async function PATCH(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const churchId = typeof body?.churchId === "string" ? body.churchId : "";
  const action   = typeof body?.action   === "string" ? body.action   : "";

  if (!churchId || !action) {
    return Response.json({ error: "churchId and action required." }, { status: 400 });
  }

  const admin = adminClient();

  if (action === "deactivate") {
    const { error } = await admin
      .from("churches")
      .update({ subscription_status: "suspended" })
      .eq("id", churchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  if (action === "reactivate") {
    const { error } = await admin
      .from("churches")
      .update({ subscription_status: "trial" })
      .eq("id", churchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  if (action === "impersonate") {
    // Find the admin user for this church
    const { data: cu } = await admin
      .from("church_users")
      .select("user_id")
      .eq("church_id", churchId)
      .eq("role", "admin")
      .maybeSingle();

    if (!cu?.user_id) {
      return Response.json({ error: "No admin user found for this church." }, { status: 404 });
    }

    const { data: userData } = await admin.auth.admin.getUserById(cu.user_id);
    const userEmail = userData?.user?.email;
    if (!userEmail) {
      return Response.json({ error: "Admin user has no email." }, { status: 400 });
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });
    if (linkErr) return Response.json({ error: linkErr.message }, { status: 500 });

    const link = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    return Response.json({ link: link ?? null, email: userEmail });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ── DELETE — permanently delete a church ─────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!(await checkMasterAdmin(req))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const churchId = searchParams.get("churchId");
  if (!churchId) return Response.json({ error: "churchId required." }, { status: 400 });

  const admin = adminClient();

  const { error } = await admin.from("churches").delete().eq("id", churchId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
