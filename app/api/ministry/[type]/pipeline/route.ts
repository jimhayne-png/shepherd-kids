import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isChildrenType(type: string) {
  return type === "childrens" || type === "children" || type === "children-ministry";
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user }, error } = await adminClient().auth.getUser(token);

  if (error) {
    console.error("[pipeline GET] getUser error:", error.message);
    return null;
  }

  return user ?? null;
}

async function getChurchId(req: NextRequest, userId: string) {
  const selectedChurchId = req.headers.get("x-selected-church-id");

  if (selectedChurchId) {
    const { data } = await adminClient()
      .from("church_users")
      .select("church_id")
      .eq("user_id", userId)
      .eq("church_id", selectedChurchId)
      .maybeSingle();

    if (data?.church_id) return data.church_id;
  }

  const { data, error } = await adminClient()
    .from("church_users")
    .select("church_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[pipeline GET] getChurchId error:", error.message);
    return null;
  }

  return data?.church_id ?? null;
}

function weeksAttending(joinedDate: string | null): number {
  if (!joinedDate) return 0;
  const ms = Date.now() - new Date(joinedDate + "T00:00:00").getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const churchId = await getChurchId(req, user.id);
  if (!churchId) return Response.json({ error: "No church found" }, { status: 403 });

  if (!isChildrenType(type)) {
    return Response.json(
      { error: `Unsupported ministry type for ShepherdKids: ${type}` },
      { status: 400 }
    );
  }

  const admin = adminClient();

  const { data: children, error: childrenError } = await admin
    .from("cm_visitor_children")
    .select("id, first_name, last_name, family_id, pipeline_stage, created_at")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });

  if (childrenError) {
    console.error("[pipeline GET children]", childrenError.message);
    return Response.json({ error: childrenError.message }, { status: 500 });
  }

  const familyIds = [
    ...new Set((children ?? []).map((c: any) => c.family_id as string).filter(Boolean)),
  ];

  const { data: families } = familyIds.length
    ? await admin
        .from("cm_visitor_families")
        .select("id, parent1_email, visit_date")
        .in("id", familyIds)
    : { data: [] };

  const familyMap: Record<string, any> = {};
  for (const f of families ?? []) familyMap[f.id] = f;

  const enriched = (children ?? [])
    .map((c: any) => {
      const fam = familyMap[c.family_id] ?? {};
      const joinedDate = fam.visit_date ?? null;

      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: fam.parent1_email ?? null,
        pipeline_stage: c.pipeline_stage ?? null,
        joined_date: joinedDate,
        weeks_attending: weeksAttending(joinedDate),
        last_contact_date: null,
      };
    })
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const stageCounts: Record<string, number> = {};
  for (const m of enriched) {
    const stage = m.pipeline_stage ?? "Unassigned";
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  }

  return Response.json({
    members: enriched,
    stage_counts: stageCounts,
    total: enriched.length,
    church_id: churchId,
  });
}