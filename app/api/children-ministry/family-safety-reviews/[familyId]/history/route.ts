import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // Confirm family belongs to this church
  const { data: family } = await admin
    .from("cm_visitor_families")
    .select("id")
    .eq("id", familyId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (!family) return Response.json({ error: "Family not found" }, { status: 404 });

  const { data: reviews, error } = await admin
    .from("cm_family_safety_reviews")
    .select(
      "id, status, requested_at, opened_at, completed_at, completed_by_name, had_changes, change_summary",
    )
    .eq("church_id", churchId)
    .eq("family_id", familyId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ reviews: reviews ?? [] });
}
