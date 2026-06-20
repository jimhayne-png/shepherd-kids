import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MINISTRY_CONFIG, STAGE_COLORS } from "@/lib/ministry-config";

export const dynamic = "force-dynamic";

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
    console.error("[pipeline stages] getUser error:", error.message);
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
      console.error("[pipeline stages] selected church check error:", error.message);
    }
  }

  const { data, error } = await adminClient()
    .from("church_users")
    .select("church_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[pipeline stages] getChurchId error:", error.message);
    return null;
  }

  return data?.church_id ?? null;
}

type StageRow = {
  id: string;
  stage_key: string;
  name: string;
  description: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
};

type StageInput = {
  stage_key: string;
  name: string;
  description?: string | null;
  color?: string | null;
  display_order: number;
  is_active: boolean;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  const user = await getAuthUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const churchId = await getChurchId(req, user.id);
  if (!churchId) {
    return Response.json({ error: "No church found" }, { status: 403 });
  }

  const admin = adminClient();

  const { data: rows, error } = await admin
    .from("ministry_pipeline_stages")
    .select("id, stage_key, name, description, color, display_order, is_active")
    .eq("church_id", churchId)
    .eq("ministry_type", type)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[pipeline stages GET]", error.message);
  }

  if (rows?.length) {
    return Response.json({
      stages: (rows as StageRow[]).map((r) => ({
        id: r.id,
        stage_key: r.stage_key,
        name: r.name,
        description: r.description,
        color: r.color,
        display_order: r.display_order,
        is_active: r.is_active,
        is_default: false,
      })),
      church_id: churchId,
    });
  }

  const cfg = MINISTRY_CONFIG[type];

  if (!cfg) {
    return Response.json({
      stages: [],
      church_id: churchId,
    });
  }

  const defaultStages = (cfg.pipelineStages ?? cfg.stages ?? []).map(
    (name, idx) => ({
      id: null,
      stage_key: name,
      name,
      description: cfg.stageDescriptions?.[name] ?? null,
      color: STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)],
      display_order: idx,
      is_active: true,
      is_default: true,
    })
  );

  return Response.json({
    stages: defaultStages,
    church_id: churchId,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  const user = await getAuthUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const churchId = await getChurchId(req, user.id);
  if (!churchId) {
    return Response.json({ error: "No church found" }, { status: 403 });
  }

  const body = await req.json();

  const stages: StageInput[] = body.stages;

  if (!Array.isArray(stages) || stages.length === 0) {
    return Response.json({ error: "stages array required" }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date().toISOString();

  const upserts = stages.map((s, idx) => ({
    church_id: churchId,
    ministry_type: type,
    stage_key: s.stage_key,
    name: s.name.trim(),
    description: s.description?.trim() || null,
    color: s.color || null,
    display_order: s.display_order ?? idx,
    is_active: s.is_active,
    updated_at: now,
  }));

  const { data, error } = await admin
    .from("ministry_pipeline_stages")
    .upsert(upserts, {
      onConflict: "church_id,ministry_type,stage_key",
    })
    .select("id, stage_key, name, description, color, display_order, is_active");

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({
    stages: ((data ?? []) as StageRow[]).map((r) => ({
      id: r.id,
      stage_key: r.stage_key,
      name: r.name,
      description: r.description,
      color: r.color,
      display_order: r.display_order,
      is_active: r.is_active,
      is_default: false,
    })),
    church_id: churchId,
  });
}