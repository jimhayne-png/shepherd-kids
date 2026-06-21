import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const VALID_STAGES = new Set([
  "Visitor",
  "Engaged",
  "Faith Decision",
  "Baptism",
  "Discipleship",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;

  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const pipelineStage = String(body.pipeline_stage ?? "").trim();

  if (!pipelineStage) {
    return Response.json({ error: "pipeline_stage is required" }, { status: 400 });
  }

  if (!VALID_STAGES.has(pipelineStage)) {
    return Response.json({ error: `Invalid stage: ${pipelineStage}` }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from("cm_visitor_children")
    .update({ pipeline_stage: pipelineStage })
    .eq("id", childId)
    .eq("church_id", ctx.churchId)
    .select("id, first_name, last_name, pipeline_stage")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Child not found" }, { status: 404 });

  return Response.json({ child: data });
}