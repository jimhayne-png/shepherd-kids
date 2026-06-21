import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const STAGES = [
  {
    id: null,
    stage_key: "Visitor",
    name: "Visitor",
    description: "New or recently checked-in child.",
    color: "#7B2CBF",
    display_order: 0,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Engaged",
    name: "Engaged",
    description: "Attending and beginning to connect.",
    color: "#D4AF37",
    display_order: 1,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Faith Decision",
    name: "Faith Decision",
    description: "Has made or discussed a faith decision.",
    color: "#22C55E",
    display_order: 2,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Baptism",
    name: "Baptism",
    description: "Ready for or completed baptism.",
    color: "#38BDF8",
    display_order: 3,
    is_active: true,
    is_default: true,
  },
  {
    id: null,
    stage_key: "Discipleship",
    name: "Discipleship",
    description: "Growing in next steps with care.",
    color: "#F97316",
    display_order: 4,
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