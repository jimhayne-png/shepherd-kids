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
    console.error("[pipeline PATCH] getUser error:", error.message);
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
    console.error("[pipeline PATCH] getChurchId error:", error.message);
    return null;
  }

  return data?.church_id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; memberId: string }> }
) {
  const { type, memberId } = await params;

  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const churchId = await getChurchId(req, user.id);
  if (!churchId) return Response.json({ error: "No church found" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const pipelineStage = typeof body?.pipeline_stage === "string" ? body.pipeline_stage.trim() : "";

  if (!pipelineStage) {
    return Response.json({ error: "pipeline_stage required" }, { status: 400 });
  }

  if (isChildrenType(type)) {
    const { data, error } = await adminClient()
      .from("cm_visitor_children")
      .update({ pipeline_stage: pipelineStage })
      .eq("church_id", churchId)
      .eq("id", memberId)
      .select("id, first_name, last_name, pipeline_stage")
      .single();

    if (error) {
      console.error("[pipeline PATCH children]", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ record: data });
  }

  return Response.json(
    { error: `Unsupported ministry type for ShepherdKids: ${type}` },
    { status: 400 }
  );
}