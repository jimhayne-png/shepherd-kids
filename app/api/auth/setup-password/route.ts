import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET ?token=xxx — validate setup token ────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return Response.json({ valid: false, reason: "missing_token" });

  const admin = adminClient();

  const { data: row, error } = await admin
    .from("church_users")
    .select("user_id, password_set")
    .eq("setup_token", token)
    .maybeSingle();

  if (error || !row) {
    return Response.json({ valid: false, reason: "not_found" });
  }

  // Fetch user email
  const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
  const email = userData?.user?.email ?? null;

  return Response.json({ valid: true, email, password_set: row.password_set });
}

// ── POST { token, password } — set password and complete setup ───────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token    = typeof body?.token    === "string" ? body.token.trim()    : "";
  const password = typeof body?.password === "string" ? body.password        : "";

  if (!token)                return Response.json({ error: "Missing setup token." },           { status: 400 });
  if (!password)             return Response.json({ error: "Password is required." },          { status: 400 });
  if (password.length < 8)   return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const admin = adminClient();

  // Look up the setup token — must still be pending (password_set = false)
  const { data: row, error: rowErr } = await admin
    .from("church_users")
    .select("id, user_id, password_set")
    .eq("setup_token", token)
    .maybeSingle();

  if (rowErr || !row) {
    return Response.json({ error: "This setup link is invalid." }, { status: 400 });
  }

  if (row.password_set) {
    return Response.json({ error: "Password already set. Please sign in." }, { status: 409 });
  }

  // Set the password via admin API
  const { error: pwErr } = await admin.auth.admin.updateUserById(row.user_id, { password });
  if (pwErr) {
    return Response.json({ error: pwErr.message }, { status: 500 });
  }

  // Mark setup complete and clear the token
  const { error: updateErr } = await admin
    .from("church_users")
    .update({ password_set: true, setup_token: null })
    .eq("id", row.id);

  if (updateErr) {
    console.error("[setup-password] Failed to clear setup token:", updateErr.message);
    // Non-fatal — password was already set successfully
  }

  return Response.json({ success: true });
}
