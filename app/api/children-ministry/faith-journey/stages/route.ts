import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const STAGES = [
  {
    id: null,
    stage_key: "Visitor",
    name: "Visitor",
    description: "First-time guest",
    color: "#7B2CBF",
    display_order: 0,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Regular",
    name: "Regular",
    description: "Attended 4+ times",
    color: "#6366f1",
    display_order: 1,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Engaged",
    name: "Engaged",
    description: "Participates and builds relationships",
    color: "#D4AF37",
    display_order: 2,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Growing in Faith",
    name: "Growing in Faith",
    description: "Learning God's Word, prayer, and Biblical truth",
    color: "#10b981",
    display_order: 3,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Faith Decision",
    name: "Faith Decision",
    description: "Made a personal decision to follow Jesus Christ",
    color: "#22C55E",
    display_order: 4,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Baptism",
    name: "Baptism",
    description: "Publicly declared faith through baptism",
    color: "#38BDF8",
    display_order: 5,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Discipleship Step",
    name: "Discipleship Step",
    description: "Becoming part of a team and helping others grow",
    color: "#F97316",
    display_order: 6,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Leadership",
    name: "Leadership",
    description: "Leading a team and helping others grow",
    color: "#ec4899",
    display_order: 7,
    is_active: true,
    is_default: true,
  },
];

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({
    stages: STAGES,
    church_id: ctx.churchId,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({
    stages: STAGES,
    church_id: ctx.churchId,
  });
}