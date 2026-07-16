import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { Resend } from "resend";

// Runs daily via Vercel cron. Sends reminder emails to churches whose
// app-level trial ends in approximately 7, 3, 1, or 0 days.
// Days are calculated via Math.round so each reminder fires once per church.

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

const REMINDERS: Record<number, Reminder> = {
  7: {
    daysLeft: 7,
    subject:  "Your ShepherdKids trial is going great!",
    heading:  "You're halfway through your free trial.",
    body: `Your ShepherdKids trial has been running for one week, and we hope your children's ministry team is already feeling the difference.<br><br>
You have full access to everything during your trial — secure check-in, parent communication, attendance tracking, faith journey recording, and more.<br><br>
To keep everything running without interruption, add your payment method before your trial ends. <strong>You won't be charged today.</strong>`,
    cta: "Add Payment Method",
  },
  3: {
    daysLeft: 3,
    subject:  "Only a few days left in your free trial",
    heading:  "Your trial ends in 3 days.",
    body: `Keep your check-in records, family profiles, attendance history, and ministry data by adding your payment method today.<br><br>
<strong>You won't be charged today.</strong> Your first charge occurs after your trial period ends.`,
    cta: "Add Payment Method",
  },
  1: {
    daysLeft: 1,
    subject:  "Keep your ministry running without interruption",
    heading:  "Your trial ends tomorrow.",
    body: `Don't lose your family records, attendance data, and ministry history. Add your payment method today to keep everything running.<br><br>
<strong>You won't be charged today.</strong>`,
    cta: "Continue with ShepherdKids",
  },
  0: {
    daysLeft: 0,
    subject:  "Add your payment method to continue your ministry",
    heading:  "Your free trial ends today.",
    body: `Add your payment method now to keep your ministry running without interruption. All your family records, attendance data, and history will be preserved.<br><br>
<strong>You won't be charged until after your trial period ends.</strong>`,
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
      ${reminder.cta} →
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;" />
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
      Sent by ShepherdKids &middot;
      <a href="${billingUrl}" style="color:#9ca3af;">Manage your subscription</a>
    </p>
  </div>
</div>`.trim();
}

async function processChurch(
  churchId: string,
  churchName: string,
  trialEndsAt: string,
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

  // Calculate days remaining (rounded to nearest integer for daily cron matching)
  const msLeft   = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.round(msLeft / 86_400_000);
  const reminder = REMINDERS[daysLeft];
  if (!reminder) return false;

  // Get primary admin email
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
    return true;
  } catch {
    return false;
  }
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

  // Fetch churches in the reminder window (trial ends within the next ~8 days or ended today)
  const windowStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString();

  const { data: churches } = await admin
    .from("churches")
    .select("id, name, trial_ends_at")
    .eq("subscription_status", "trial")
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", windowStart)
    .lte("trial_ends_at", windowEnd);

  let sent = 0;
  for (const church of churches ?? []) {
    const ok = await processChurch(church.id, church.name, church.trial_ends_at, resend, baseUrl);
    if (ok) sent++;
  }

  return Response.json({ sent, checked: (churches ?? []).length, mode: "cron" });
}
