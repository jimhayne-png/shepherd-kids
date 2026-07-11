import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizePhone(phone: string | null | undefined): string {
  return String(phone ?? "").replace(/\D/g, "");
}

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export type JourneyTouch = {
  id: string;
  method: string;
  completed_at: string;
  completed_by: string;
};

export type JourneyFamily = {
  id: string;
  family_name: string;
  primary_parent: string;
  primary_email: string | null;
  primary_phone: string | null;
  first_visit_date: string;
  days_since_visit: number;
  status: "pre_followup" | "waiting" | "returned" | "inactive";
  return_date: string | null;
  days_to_return: number | null;
  children: string[];
  follow_up_sent: boolean;
  follow_up_sent_at: string | null;
  next_day_sent: boolean;
  next_day_sent_at: string | null;
  journey_touches: JourneyTouch[];
};

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { churchId } = auth;

  const admin = adminClient();
  const now = new Date();

  const [familiesRes, childrenRes] = await Promise.all([
    admin
      .from("cm_visitor_families")
      .select(
        "id, parent1_first_name, parent1_last_name, parent1_email, parent1_phone, " +
        "parent2_email, parent2_phone, visit_date, follow_up_sent, follow_up_sent_at, " +
        "next_day_sent, next_day_sent_at, created_at",
      )
      .eq("church_id", churchId)
      .order("visit_date", { ascending: false }),
    admin
      .from("cm_visitor_children")
      .select("id, family_id, first_name, last_name")
      .eq("church_id", churchId),
  ]);

  type FamilyRow = {
    id: string;
    parent1_first_name: string | null;
    parent1_last_name: string | null;
    parent1_email: string | null;
    parent1_phone: string | null;
    parent2_email: string | null;
    parent2_phone: string | null;
    visit_date: string | null;
    follow_up_sent: boolean | null;
    follow_up_sent_at: string | null;
    next_day_sent: boolean | null;
    next_day_sent_at: string | null;
    created_at: string | null;
  };

  type ChildRow = { id: string; family_id: string; first_name: string | null; last_name: string | null };
  type RecordRow = { session_id: string | null; parent_phone: string | null };
  type SessionRow = { id: string; date: string | null };
  type TouchRow = { id: string; family_id: string; method: string; completed_at: string; completed_by: string };

  const families = (familiesRes.data ?? []) as unknown as FamilyRow[];
  const children = (childrenRes.data ?? []) as unknown as ChildRow[];

  // Children names grouped by family
  const childrenByFamily = new Map<string, string[]>();
  for (const c of children) {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
    if (!childrenByFamily.has(c.family_id)) childrenByFamily.set(c.family_id, []);
    childrenByFamily.get(c.family_id)!.push(name);
  }

  // Collect all unique normalized phones
  const allPhones = [
    ...new Set(
      families
        .flatMap((f) => [f.parent1_phone, f.parent2_phone])
        .map(normalizePhone)
        .filter(Boolean),
    ),
  ];

  // Checkin records for these phones
  const { data: rawRecords } = allPhones.length
    ? await admin
        .from("cm_checkin_records")
        .select("session_id, parent_phone")
        .eq("church_id", churchId)
        .in("parent_phone", allPhones)
    : { data: [] };

  const records = (rawRecords ?? []) as unknown as RecordRow[];

  // Sessions for those records — to get session dates
  const sessionIds = [...new Set(records.map((r) => r.session_id as string).filter(Boolean))];
  const { data: rawSessions } = sessionIds.length
    ? await admin
        .from("cm_checkin_sessions")
        .select("id, date")
        .in("id", sessionIds)
    : { data: [] };

  // Map: session_id → date string
  const sessions = (rawSessions ?? []) as unknown as SessionRow[];
  const sessionDateMap = new Map<string, string>();
  for (const s of sessions) if (s.date) sessionDateMap.set(s.id, s.date);

  // Map: normalized phone → sorted array of session dates (all attendance dates)
  const datesByPhone = new Map<string, string[]>();
  for (const r of records) {
    const phone = normalizePhone(r.parent_phone);
    if (!phone || !r.session_id) continue;
    const date = sessionDateMap.get(r.session_id);
    if (!date) continue;
    if (!datesByPhone.has(phone)) datesByPhone.set(phone, []);
    datesByPhone.get(phone)!.push(date);
  }

  // Journey touches grouped by family
  const familyIds = families.map((f) => f.id);
  const { data: rawTouches } = familyIds.length
    ? await admin
        .from("cm_visitor_journey_touches")
        .select("id, family_id, method, completed_at, completed_by")
        .eq("church_id", churchId)
        .in("family_id", familyIds)
        .order("completed_at", { ascending: true })
    : { data: [] };

  const allTouches = (rawTouches ?? []) as unknown as TouchRow[];
  const touchesByFamily = new Map<string, JourneyTouch[]>();
  for (const t of allTouches) {
    if (!touchesByFamily.has(t.family_id)) touchesByFamily.set(t.family_id, []);
    touchesByFamily.get(t.family_id)!.push({
      id: t.id,
      method: t.method,
      completed_at: t.completed_at,
      completed_by: t.completed_by,
    });
  }

  // Derive status for each family from attendance data
  const result: JourneyFamily[] = families.map((family) => {
    const phone = normalizePhone(family.parent1_phone);
    const firstVisitDate = family.visit_date ?? family.created_at?.slice(0, 10) ?? "";
    const daySinceVisit = firstVisitDate ? daysSince(firstVisitDate, now) : 0;

    const allDates = datesByPhone.get(phone) ?? [];
    const returnDates = allDates.filter((d) => d > firstVisitDate).sort();

    const returnDate = returnDates[0] ?? null;
    const daysToReturn =
      returnDate && firstVisitDate ? daysBetween(firstVisitDate, returnDate) : null;

    let status: "pre_followup" | "waiting" | "returned" | "inactive";
    if (returnDate) {
      status = "returned";
    } else if (daySinceVisit >= 42) {
      status = "inactive";
    } else if (daySinceVisit >= 7) {
      status = "waiting";
    } else {
      status = "pre_followup";
    }

    return {
      id: family.id,
      family_name: `${family.parent1_last_name ?? ""} Family`,
      primary_parent: `${family.parent1_first_name ?? ""} ${family.parent1_last_name ?? ""}`.trim(),
      primary_email: family.parent1_email ?? family.parent2_email ?? null,
      primary_phone: family.parent1_phone ?? null,
      first_visit_date: firstVisitDate,
      days_since_visit: daySinceVisit,
      status,
      return_date: returnDate,
      days_to_return: daysToReturn,
      children: childrenByFamily.get(family.id) ?? [],
      follow_up_sent: family.follow_up_sent ?? false,
      follow_up_sent_at: family.follow_up_sent_at ?? null,
      next_day_sent: family.next_day_sent ?? false,
      next_day_sent_at: family.next_day_sent_at ?? null,
      journey_touches: touchesByFamily.get(family.id) ?? [],
    };
  });

  const counts = {
    waiting:  result.filter((f) => f.status === "waiting").length,
    returned: result.filter((f) => f.status === "returned").length,
    inactive: result.filter((f) => f.status === "inactive").length,
  };

  return Response.json({ families: result, counts });
}

// ── POST ──────────────────────────────────────────────────────────────────────

const VALID_METHODS = ["email", "phone_call", "handwritten_card", "in_person", "no_follow_up"] as const;

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { churchId } = auth;

  const { familyId, method, completedBy } = (await request.json()) as {
    familyId: string;
    method: string;
    completedBy: string;
  };

  if (!familyId || !method || !completedBy?.trim()) {
    return Response.json({ error: "familyId, method, and completedBy required" }, { status: 400 });
  }

  if (!VALID_METHODS.includes(method as (typeof VALID_METHODS)[number])) {
    return Response.json({ error: "Invalid method" }, { status: 400 });
  }

  const admin = adminClient();

  // Verify family belongs to this church
  const { data: family } = await admin
    .from("cm_visitor_families")
    .select("id")
    .eq("id", familyId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (!family) return Response.json({ error: "Family not found" }, { status: 404 });

  const { data: touch, error } = await admin
    .from("cm_visitor_journey_touches")
    .insert({
      church_id: churchId,
      family_id: familyId,
      method,
      completed_by: completedBy.trim(),
    })
    .select("id, method, completed_at, completed_by")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ touch });
}
