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

  const envOwnerEmails = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = Array.from(
    new Set([MASTER_ADMIN_EMAIL.toLowerCase(), ...envOwnerEmails])
  );

  const allowed = allowedEmails.includes(user.email.toLowerCase());

  if (!allowed) {
    console.error("[master-admin/subscriptions] Forbidden email:", user.email);
    console.error("[master-admin/subscriptions] Allowed emails:", allowedEmails);
  }

  return allowed;
}

const CHURCH_SELECT =
  "id, name, city, state, email, phone, subscription_status, subscription_tier, trial_ends_at, created_at";

export async function GET(req: NextRequest) {
  const ok = await checkMasterAdmin(req);

  if (!ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await adminClient()
    .from("churches")
    .select(CHURCH_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[master-admin/subscriptions] GET error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ churches: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const ok = await checkMasterAdmin(req);

  if (!ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const churchId = typeof body?.churchId === "string" ? body.churchId : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!churchId || !action) {
    return Response.json(
      { error: "churchId and action required" },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const now = new Date();

  let updates: Record<string, unknown> = {};

  if (action === "reset_trial_30" || action === "reactivate_trial") {
    const newDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    updates = {
      subscription_status: "trial",
      trial_ends_at: newDate.toISOString(),
    };
  } else if (action === "extend_trial_7" || action === "extend_trial_30") {
    const days = action === "extend_trial_7" ? 7 : 30;

    const { data: church, error: churchError } = await admin
      .from("churches")
      .select("trial_ends_at")
      .eq("id", churchId)
      .single();

    if (churchError) {
      console.error(
        "[master-admin/subscriptions] Trial lookup error:",
        churchError.message
      );
      return Response.json({ error: churchError.message }, { status: 500 });
    }

    const base =
      church?.trial_ends_at && new Date(church.trial_ends_at) > now
        ? new Date(church.trial_ends_at)
        : now;

    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    updates = {
      subscription_status: "trial",
      trial_ends_at: newDate.toISOString(),
    };
  } else if (action === "mark_paid") {
    updates = {
      subscription_status: "active",
      subscription_tier: "paid",
    };
  } else if (action === "suspend") {
    updates = {
      subscription_status: "suspended",
    };
  } else {
    return Response.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("churches")
    .update(updates)
    .eq("id", churchId)
    .select(CHURCH_SELECT)
    .single();

  if (error) {
    console.error("[master-admin/subscriptions] PATCH error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ church: data });
}