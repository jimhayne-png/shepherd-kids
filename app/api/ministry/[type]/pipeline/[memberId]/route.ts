import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function isChildrenType(type: string) {
  return type === "childrens" || type === "children" || type === "children-ministry";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; memberId: string }> }
) {
  const { type, memberId } = await params;

  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pipelineStage = typeof body?.pipeline_stage === "string" ? body.pipeline_stage.trim() : "";

  if (!pipelineStage) {
    return Response.json({ error: "pipeline_stage required" }, { status: 400 });
  }

  if (isChildrenType(type)) {
    const { data, error } = await adminClient()
      .from("cm_visitor_children")
      .update({ pipeline_stage: pipelineStage })
      .eq("church_id", ctx.churchId)
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
