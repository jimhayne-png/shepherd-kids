import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function weeksAttending(joinedDate: string | null): number {
  if (!joinedDate) return 0;
  const ms = Date.now() - new Date(joinedDate + "T00:00:00").getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)));
}

function resolveChurchId(request: NextRequest, ctx: Awaited<ReturnType<typeof getAuthContext>>) {
  return (
    request.headers.get("x-selected-church-id") ??
    request.headers.get("X-Selected-Church-Id") ??
    ctx?.churchId ??
    null
  );
}

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  const churchId = resolveChurchId(request, ctx);

  if (!churchId) {
    return Response.json(
      {
        error: "Unauthorized",
        detail: "Missing auth context or selected church id.",
      },
      { status: 401 }
    );
  }

  console.log("Faith Journey GET churchId:", churchId);

  const admin = adminClient();

  const { data: children, error } = await admin
    .from("cm_visitor_children")
    .select("id, first_name, last_name, family_id, pipeline_stage, created_at")
    .eq("church_id", churchId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  console.log("Faith Journey error:", error);
  console.log("Faith Journey raw results:", JSON.stringify(children));

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const familyIds = [
    ...new Set((children ?? []).map((c) => c.family_id).filter((id): id is string => Boolean(id))),
  ];

  const { data: families, error: familiesError } = familyIds.length
    ? await admin
        .from("cm_visitor_families")
        .select("id, parent1_email, visit_date")
        .in("id", familyIds)
    : { data: [], error: null };

  if (familiesError) {
    return Response.json({ error: familiesError.message }, { status: 500 });
  }

  const familyMap = new Map((families ?? []).map((f) => [f.id, f]));

  const members = (children ?? []).map((child) => {
    const family = familyMap.get(child.family_id);
    const joinedDate = family?.visit_date ?? child.created_at?.slice(0, 10) ?? null;

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
    church_id: churchId,
  });
}