import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function weeksAttending(joinedDate: string | null): number {
  if (!joinedDate) return 0;
  const ms = Date.now() - new Date(joinedDate + "T00:00:00").getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)));
}

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();

  const { data: children, error } = await admin
    .from("cm_visitor_children")
    .select("id, first_name, last_name, family_id, pipeline_stage, created_at")
    .eq("church_id", ctx.churchId)
    .order("last_name", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const familyIds = [...new Set((children ?? []).map((c) => c.family_id).filter(Boolean))];

  const { data: families } = familyIds.length
    ? await admin
        .from("cm_visitor_families")
        .select("id, parent1_email, visit_date")
        .in("id", familyIds)
    : { data: [] };

  const familyMap = new Map((families ?? []).map((f) => [f.id, f]));

  const members = (children ?? []).map((child) => {
    const family = familyMap.get(child.family_id);
    const joinedDate = family?.visit_date ?? null;

    return {
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name,
      email: family?.parent1_email ?? null,
      pipeline_stage: child.pipeline_stage ?? "Visitor",
      joined_date: joinedDate,
      weeks_attending: weeksAttending(joinedDate),
      last_contact_date: null,
    };
  });

  return Response.json({
    members,
    total: members.length,
    church_id: ctx.churchId,
  });
}