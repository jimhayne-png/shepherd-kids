import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // Verify the family belongs to this church — never trust the caller's churchId alone
  const { data: family, error: familyError } = await admin
    .from("cm_visitor_families")
    .select("id, parent1_first_name, parent1_last_name")
    .eq("id", familyId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (familyError || !family) {
    return Response.json({ error: "Family not found" }, { status: 404 });
  }

  // Generate a cryptographically secure random token (never stored)
  const rawToken = crypto.randomBytes(32).toString("hex");
  // Only the SHA-256 digest is persisted
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Invalidate any existing draft tokens for this family by expiring them immediately.
  // This ensures only one pending link is valid at a time.
  await admin
    .from("cm_family_safety_reviews")
    .update({ token_expires_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("church_id", churchId)
    .eq("family_id", familyId)
    .eq("status", "draft")
    .not("token_hash", "is", null);

  // Create a new draft review row — this becomes the completed review record when submitted
  const { error: insertError } = await admin
    .from("cm_family_safety_reviews")
    .insert({
      church_id: churchId,
      family_id: familyId,
      status: "draft",
      token_hash: tokenHash,
      token_expires_at: expiresAt.toISOString(),
      requested_at: now.toISOString(),
      confirmation_accepted: false,
    });

  if (insertError) {
    return Response.json({ error: "Failed to create review request" }, { status: 500 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  // Raw token appears only in the returned URL — never logged, never stored
  const reviewUrl = `${baseUrl}/family-safety-review/${rawToken}`;

  return Response.json({
    success: true,
    reviewUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
