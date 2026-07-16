import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { Resend } from "resend";

// Runs daily via Vercel cron. Sends reminder emails on Day 10 (4 days remaining)
// and Day 14 (trial ends today). Each reminder is sent at most once per church
// via persistent tracking columns on the churches table.

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Reminder = {
  daysLeft: number;
  subject: string;
  heading: string;
  body: string;
  cta: string;
};

// daysLeft key = days remaining in the 14-day trial at time of sending
const REMINDERS: Record<number, Reminder> = {
  4: {
    daysLeft: 4,
    subject: "Keep ShepherdKids Ready for Your Ministry",
    heading: "Four days remain in your initial free period.",
    body: `Your ShepherdKids account has four days remaining in its initial free period.<br><br>
Finish setting up billing now so your ministry can continue without interruption.<br><br>
<strong>You will not be charged today.</strong> Once your payment method is added, your church will automatically receive additional time before the first $49 monthly payment.`,
    cta: "Finish Billing Setup",
  },
  0: {
    daysLeft: 0,
    subject: "Your ShepherdKids Free Period Ends Today",
    heading: "Your initial free period ends today.",
    body: `Your initial ShepherdKids free period ends today.<br><br>
Add your payment method to keep your ministry active.<br><br>
<strong>You will not be charged today</strong>, and your church will receive additional time before the first $49 monthly payment.<br><br>
Your church information remains safe even if billing is not completed today.`,
    cta: "Add Payment Method",
  },
};

function buildEmail(churchName: string, reminder: Reminder, billingUrl: string): string {
  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:linear-gradient(135deg,#0d0720 0%,#1a0f35 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;font-weight:600;">${churchName}</h1>
    <p style="color:#D4AF37;margin:6px 0 0;font-size:13px;letter-spacing:0.05em;">ShepherdKids — Children's Ministry Platform</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#7B2CBF;font-size:22px;font-weight:700;margin:0 0 16px;font-family:Georgia,serif;">
      ${reminder.heading}
    </h2>
    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 24px;">
      ${reminder.body}
    </p>
    <a href="${billingUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#7B2CBF,#9D4EDD);color:white;padding:13px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
      ${reminder.cta} &rarr;
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;" />
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
      Sent by ShepherdKids &middot;
      <a href="${billingUrl}" style="color:#9ca3af;">Manage your subscription</a>
    </p>
  </div>
</div>`.trim();
}

type ChurchRow = {
  id: string;
  name: string;
  trial_ends_at: string;
  trial_day10_email_sent_at: string | null;
  trial_day14_email_sent_at: string | null;
};

async function processChurch(
  churchId: string,
  churchName: string,
  trialEndsAt: string,
  day10SentAt: string | null,
  day14SentAt: string | null,
  resend: Resend,
  baseUrl: string,
): Promise<boolean> {
  const admin = adminClient();

  // Skip churches that already have an active Stripe subscription
  const { data: sub } = await admin
    .from("church_subscriptions")
    .select("status")
    .eq("church_id", churchId)
    .maybeSingle();
  if (sub?.status === "active" || sub?.status === "trialing") return false;

  // Days remaining in the 14-day trial (rounded for daily cron matching)
  const msLeft  = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.round(msLeft / 86_400_000);
  const reminder = REMINDERS[daysLeft];
  if (!reminder) return false;

  // Persistent deduplication — skip if this reminder was already delivered
  if (daysLeft === 4 && day10SentAt) return false;
  if (daysLeft === 0 && day14SentAt) return false;

  // Primary admin email
  const { data: cu } = await admin
    .from("church_users")
    .select("user_id")
    .eq("church_id", churchId)
    .eq("role", "primary_admin")
    .maybeSingle();
  if (!cu?.user_id) return false;

  const { data: { user } } = await admin.auth.admin.getUserById(cu.user_id);
  if (!user?.email) return false;

  const billingUrl = `${baseUrl}/dashboard/billing`;
  const html = buildEmail(churchName, reminder, billingUrl);
  const from = process.env.RESEND_FROM_EMAIL
    ? `ShepherdKids <${process.env.RESEND_FROM_EMAIL}>`
    : "ShepherdKids <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from,
      to: [user.email],
      subject: reminder.subject,
      html,
    });
  } catch (err) {
    console.error(`[trial-reminders] Delivery failed for church ${churchId}:`, err);
    return false; // Leave sent_at null so the next cron run retries
  }

  // Mark as sent only after confirmed delivery
  if (daysLeft === 4) {
    await admin.from("churches").update({ trial_day10_email_sent_at: new Date().toISOString() }).eq("id", churchId);
  } else {
    await admin.from("churches").update({ trial_day14_email_sent_at: new Date().toISOString() }).eq("id", churchId);
  }

  return true;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || bearerToken !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend  = new Resend(process.env.RESEND_API_KEY!);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.shepherdkidsapp.com").replace(/\/$/, "");
  const admin   = adminClient();

  // Window covers Day 14 (trial ends today, ±1d) and Day 10 (4 days left, up to 5.5d away)
  const windowStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString();

  const { data: churches } = await admin
    .from("churches")
    .select("id, name, trial_ends_at, trial_day10_email_sent_at, trial_day14_email_sent_at")
    .eq("subscription_status", "trial")
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", windowStart)
    .lte("trial_ends_at", windowEnd);

  let sent = 0;
  for (const church of (churches ?? []) as ChurchRow[]) {
    const ok = await processChurch(
      church.id,
      church.name,
      church.trial_ends_at,
      church.trial_day10_email_sent_at,
      church.trial_day14_email_sent_at,
      resend,
      baseUrl,
    );
    if (ok) sent++;
  }

  return Response.json({ sent, checked: (churches ?? []).length, mode: "cron" });
}
