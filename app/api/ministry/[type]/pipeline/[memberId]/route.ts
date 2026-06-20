import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

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
    console.error("[pipeline PATCH] getUser error:", error.message);
    return null;
  }

  return user ?? null;
}

async function getChurchId(req: NextRequest, userId: string) {
  const selectedChurchId = req.headers.get("x-selected-church-id");

  if (selectedChurchId) {
    const { data, error } = await adminClient()
      .from("church_users")
      .select("church_id")
      .eq("user_id", userId)
      .eq("church_id", selectedChurchId)
      .maybeSingle();

    if (!error && data?.church_id) {
      return data.church_id;
    }

    if (error) {
      console.error("[pipeline PATCH] selected church check error:", error.message);
    }
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
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const churchId = await getChurchId(req, user.id);
  if (!churchId) {
    return Response.json({ error: "No church found" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const pipelineStage =
    typeof body?.pipeline_stage === "string" ? body.pipeline_stage.trim() : "";

  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!pipelineStage) {
    return Response.json({ error: "pipeline_stage required" }, { status: 400 });
  }

  if (type === "childrens") {
    const { data, error } = await adminClient()
      .from("cm_visitor_children")
      .update({ pipeline_stage: pipelineStage })
      .eq("church_id", churchId)
      .eq("id", memberId)
      .select("id, first_name, last_name, pipeline_stage")
      .single();

    if (error) {
      console.error("[pipeline PATCH childrens]", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json(
        { error: "Child not found or does not belong to this church." },
        { status: 404 }
      );
    }

    return Response.json({ record: data });
  }

  const updatePayload: {
    pipeline_stage: string;
    notes?: string;
  } = {
    pipeline_stage: pipelineStage,
  };

  if (note) {
    updatePayload.notes = `Stage → ${pipelineStage}: ${note}`;
  }

  const { data, error } = await adminClient()
    .from("ministry_rosters")
    .update(updatePayload)
    .eq("church_id", churchId)
    .eq("ministry_type", type)
    .eq("member_id", memberId)
    .select("*")
    .single();

  if (error) {
    console.error("[pipeline PATCH roster]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json(
      { error: "Roster member not found or does not belong to this church." },
      { status: 404 }
    );
  }

  return Response.json({ record: data });
}