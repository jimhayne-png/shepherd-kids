import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { sendEmail } from "@/lib/communications/email/resend";

// Public endpoint — no auth required. Creates church + admin user in one shot.

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Rate limiting (in-memory, per-instance) ───────────────────────────────────
// Protects against burst abuse from a single IP. Resets per deployment instance.

const rlMap = new Map<string, { count: number; resetAt: number }>();
const RL_MAX    = 5;
const RL_WINDOW = 15 * 60 * 1000; // 15 minutes

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW });
    return false;
  }
  if (entry.count >= RL_MAX) return true;
  entry.count++;
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function buildWelcomeEmail(churchName: string, wizardUrl: string): string {
  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:linear-gradient(135deg,#0d0720 0%,#1a0f35 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;font-weight:600;">${churchName}</h1>
    <p style="color:#D4AF37;margin:6px 0 0;font-size:13px;letter-spacing:0.05em;">ShepherdKids — Children's Ministry Platform</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#7B2CBF;font-size:22px;font-weight:700;margin:0 0 16px;font-family:Georgia,serif;">
      Welcome to ShepherdKids.
    </h2>
    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 16px;">
      Your free 14-day period has started. ShepherdKids helps your ministry:
    </p>
    <ul style="padding:0 0 0 20px;margin:0 0 20px;color:#374151;font-size:15px;line-height:2.1;">
      <li>Welcome every family safely</li>
      <li>Know every child</li>
      <li>Keep attendance organized</li>
      <li>Follow up with families</li>
      <li>Equip classroom volunteers</li>
      <li>Shepherd every journey</li>
    </ul>
    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 24px;">
      Begin with the Getting Started guide to prepare for your first service.
    </p>
    <a href="${wizardUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#7B2CBF,#9D4EDD);color:white;padding:13px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
      Open Getting Started &rarr;
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;" />
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent by ShepherdKids</p>
  </div>
</div>`.trim();
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
  // Rate limit by IP before doing any work
  if (isRateLimited(getIp(req))) {
    return Response.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  // Honeypot: bots fill hidden fields, humans don't
  const honeypot = typeof body?.website === "string" ? body.website : "";
  if (honeypot) {
    // Silently succeed — don't reveal detection to bots
    return Response.json({ success: true });
  }

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
    role: "primary_admin",
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

  // 6. Welcome email (non-fatal — signup succeeds regardless of delivery)
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.shepherdkidsapp.com").replace(/\/$/, "");
    const from = process.env.RESEND_FROM_EMAIL
      ? `ShepherdKids <${process.env.RESEND_FROM_EMAIL}>`
      : "ShepherdKids <onboarding@resend.dev>";
    await sendEmail({
      to: adminEmail,
      subject: "Welcome to ShepherdKids",
      html: buildWelcomeEmail(churchName, `${baseUrl}/dashboard/setup-wizard`),
      from,
    });
  } catch (err) {
    console.error("[start-trial] Welcome email failed:", err);
  }

  return Response.json({ success: true, church_id: church.id });
}
