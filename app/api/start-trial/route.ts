import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

// Public endpoint — no auth required. Creates church + admin user in one shot.

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
  { name: "General",               description: "All church members",                            color: "#1A4A2E", icon: "⛪" },
  { name: "Choir & Worship",       description: "Worship team and choir members",                color: "#7C3AED", icon: "🎵" },
  { name: "Youth Group",           description: "Teen ministry ages 13-17",                      color: "#F59E0B", icon: "⚡" },
  { name: "Children's Ministry",   description: "Children ages 12 and under",                   color: "#EC4899", icon: "🌟" },
  { name: "Men's Ministry",        description: "Men's fellowship and discipleship",             color: "#2563EB", icon: "🔥" },
  { name: "Women's Ministry",      description: "Women's fellowship and discipleship",           color: "#DB2777", icon: "❤️" },
  { name: "Young Adults",          description: "Young adults ages 18-35",                      color: "#059669", icon: "🌱" },
  { name: "Ushers & Greeters",     description: "Welcome and hospitality team",                 color: "#D97706", icon: "🤝" },
  { name: "Prayer Team",           description: "Intercessory prayer ministry",                 color: "#0891B2", icon: "🙏" },
  { name: "Volunteers",            description: "General church volunteers",                    color: "#65A30D", icon: "⭐" },
  { name: "Senior Ministry",       description: "Ministry for senior members",                  color: "#6366F1", icon: "🕊️" },
  { name: "Sunday School Teachers",description: "Teachers and leaders for Sunday school",       color: "#0EA5E9", icon: "📖" },
  { name: "Missions",              description: "Outreach and missionary programs",             color: "#DC2626", icon: "🌍" },
  { name: "Bible Study Groups",    description: "Small group Bible study and discipleship",     color: "#7C2D12", icon: "📚" },
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const churchName  = (typeof body?.churchName  === "string" ? body.churchName  : "").trim();
  const city        = (typeof body?.city        === "string" ? body.city        : "").trim();
  const state       = (typeof body?.state       === "string" ? body.state       : "").trim();
  const phone       = (typeof body?.phone       === "string" ? body.phone       : "").trim();
  const churchEmail = (typeof body?.churchEmail === "string" ? body.churchEmail : "").trim().toLowerCase();
  const adminFirst  = (typeof body?.adminFirst  === "string" ? body.adminFirst  : "").trim();
  const adminLast   = (typeof body?.adminLast   === "string" ? body.adminLast   : "").trim();
  const adminEmail  = (typeof body?.adminEmail  === "string" ? body.adminEmail  : "").trim().toLowerCase();
  const password    = typeof body?.password === "string" ? body.password : "";

  if (!churchName)                return Response.json({ error: "Church name is required."                         }, { status: 400 });
  if (!adminEmail)                return Response.json({ error: "Admin email is required."                         }, { status: 400 });
  if (!password)                  return Response.json({ error: "Password is required."                            }, { status: 400 });
  if (password.length < 8)        return Response.json({ error: "Password must be at least 8 characters."         }, { status: 400 });

  const admin = adminClient();

  // Check for duplicate email up-front for a clearer error message
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailTaken = (existing?.users ?? []).some(
    (u) => u.email?.toLowerCase() === adminEmail
  );
  if (emailTaken) {
    return Response.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 }
    );
  }

  // 1. Create Supabase auth user with password
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: adminFirst || undefined,
      last_name:  adminLast  || undefined,
    },
  });
  if (createErr || !created?.user) {
    return Response.json({ error: createErr?.message ?? "Failed to create account." }, { status: 500 });
  }
  const userId = created.user.id;

  // 2. Generate unique church slug
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
      email: churchEmail || adminEmail,
      phone: phone || null,
      city:  city  || null,
      state: state || null,
      subscription_status: "trial",
      trial_ends_at: trialEndsAt,
      qr_checkin_enabled: false,
    })
    .select("id")
    .single();

  if (churchErr) {
    await admin.auth.admin.deleteUser(userId);
    return Response.json({ error: churchErr.message }, { status: 500 });
  }

  // 4. Link user to church as admin — password already set, no setup token needed
  const { error: cuErr } = await admin.from("church_users").insert({
    church_id: church.id,
    user_id: userId,
    role: "admin",
    password_set: true,
    setup_token: null,
  });

  if (cuErr) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("churches").delete().eq("id", church.id);
    return Response.json({ error: cuErr.message }, { status: 500 });
  }

  // 5. Default departments (non-fatal)
  await admin.from("departments").insert(
    DEFAULT_DEPARTMENTS.map((d) => ({ ...d, church_id: church.id }))
  );

  return Response.json({ success: true, church_id: church.id });
}
