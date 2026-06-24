import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

const MASTER_ADMIN_EMAIL = "jim@gratefulconsultinggroup.com";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await adminClient().auth.getUser(token);

  if (error) {
    console.error("[master-admin/subscriptions] getUser error:", error.message);
    return null;
  }

  return user ?? null;
}

async function checkMasterAdmin(req: NextRequest): Promise<boolean> {
  const user = await getAuthUser(req);

  if (!user?.email) {
    console.error("[master-admin/subscriptions] No authenticated email found.");
    return false;
  }

  const masterAdminEnv = (process.env.MASTER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const envOwnerEmails = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = Array.from(
    new Set([MASTER_ADMIN_EMAIL.toLowerCase(), masterAdminEnv, ...envOwnerEmails].filter(Boolean))
  );

  const allowed = allowedEmails.includes(user.email.toLowerCase());

  if (!allowed) {
    console.error("[master-admin/subscriptions] Forbidden email:", user.email);
  }

  return allowed;
}

const CHURCH_SELECT =
  "id, name, city, state, email, phone, subscription_status, subscription_tier, trial_ends_at, created_at";

const SUB_SELECT =
  "church_id, status, admin_override_enabled, admin_override_reason, admin_override_until, discount_percent, discount_reason, discount_until";

async function fetchMerged(admin: ReturnType<typeof adminClient>) {
  const [churchRes, subRes] = await Promise.all([
    admin.from("churches").select(CHURCH_SELECT).order("created_at", { ascending: false }),
    admin.from("church_subscriptions").select(SUB_SELECT),
  ]);

  if (churchRes.error) throw churchRes.error;

  const subMap = Object.fromEntries(
    (subRes.data ?? []).map((s) => [s.church_id, s])
  );

  return (churchRes.data ?? []).map((c) => ({ ...c, sub: subMap[c.id] ?? null }));
}

async function fetchMergedOne(admin: ReturnType<typeof adminClient>, churchId: string) {
  const [churchRes, subRes] = await Promise.all([
    admin.from("churches").select(CHURCH_SELECT).eq("id", churchId).single(),
    admin.from("church_subscriptions").select(SUB_SELECT).eq("church_id", churchId).maybeSingle(),
  ]);

  if (churchRes.error) throw churchRes.error;

  return { ...churchRes.data, sub: subRes.data ?? null };
}

export async function GET(req: NextRequest) {
  const ok = await checkMasterAdmin(req);
  if (!ok) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const churches = await fetchMerged(adminClient());
    return Response.json({ churches });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[master-admin/subscriptions] GET error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ok = await checkMasterAdmin(req);
  if (!ok) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const churchId = typeof body?.churchId === "string" ? body.churchId : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!churchId || !action) {
    return Response.json({ error: "churchId and action required" }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date();

  try {
    // ── Actions that update the churches table ──────────────────────────────
    if (
      action === "reset_trial_30" ||
      action === "reactivate_trial" ||
      action === "extend_trial_7" ||
      action === "extend_trial_30" ||
      action === "mark_paid" ||
      action === "suspend"
    ) {
      let updates: Record<string, unknown> = {};

      if (action === "reset_trial_30" || action === "reactivate_trial") {
        updates = {
          subscription_status: "trial",
          trial_ends_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
        };
      } else if (action === "extend_trial_7" || action === "extend_trial_30") {
        const days = action === "extend_trial_7" ? 7 : 30;
        const { data: church } = await admin
          .from("churches")
          .select("trial_ends_at")
          .eq("id", churchId)
          .single();

        const base =
          church?.trial_ends_at && new Date(church.trial_ends_at) > now
            ? new Date(church.trial_ends_at)
            : now;

        updates = {
          subscription_status: "trial",
          trial_ends_at: new Date(base.getTime() + days * 86_400_000).toISOString(),
        };
      } else if (action === "mark_paid") {
        updates = { subscription_status: "active", subscription_tier: "paid" };
      } else if (action === "suspend") {
        updates = { subscription_status: "suspended" };
      }

      const { error } = await admin.from("churches").update(updates).eq("id", churchId);
      if (error) throw error;

      const church = await fetchMergedOne(admin, churchId);
      return Response.json({ church });
    }

    // ── Billing override + discount controls ────────────────────────────────
    if (action === "set_billing_controls") {
      const overrideEnabled = body.overrideEnabled === true;
      const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() || null : null;
      const overrideUntil = typeof body.overrideUntil === "string" && body.overrideUntil ? body.overrideUntil : null;
      const discountPercent = typeof body.discountPercent === "number" ? body.discountPercent : null;
      const discountReason = typeof body.discountReason === "string" ? body.discountReason.trim() || null : null;
      const discountUntil = typeof body.discountUntil === "string" && body.discountUntil ? body.discountUntil : null;

      const { error } = await admin.from("church_subscriptions").upsert(
        {
          church_id: churchId,
          admin_override_enabled: overrideEnabled,
          admin_override_reason: overrideReason,
          admin_override_until: overrideUntil,
          discount_percent: discountPercent,
          discount_reason: discountReason,
          discount_until: discountUntil,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "church_id" }
      );
      if (error) throw error;

      const church = await fetchMergedOne(admin, churchId);
      return Response.json({ church });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[master-admin/subscriptions] PATCH error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
