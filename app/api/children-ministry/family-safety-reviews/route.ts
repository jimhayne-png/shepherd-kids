import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";
import { getReviewStatus } from "@/lib/family-safety-review";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { churchId } = ctx;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? "all";
  const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();

  const admin = adminClient();

  const { data: families, error: familiesError } = await admin
    .from("cm_visitor_families")
    .select("id, parent1_first_name, parent1_last_name, parent1_email, visit_date, created_at")
    .eq("church_id", churchId)
    .order("parent1_last_name", { ascending: true })
    .order("parent1_first_name", { ascending: true });

  if (familiesError) return Response.json({ error: familiesError.message }, { status: 500 });

  const allFamilies = families ?? [];

  // Load completed reviews and pending draft requests in parallel
  const [completedResult, draftResult] = allFamilies.length
    ? await Promise.all([
        admin
          .from("cm_family_safety_reviews")
          .select("family_id, completed_at")
          .eq("church_id", churchId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        admin
          .from("cm_family_safety_reviews")
          .select("family_id, requested_at, token_expires_at, opened_at")
          .eq("church_id", churchId)
          .eq("status", "draft")
          .not("token_hash", "is", null)
          .order("requested_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  // Most recent completed review per family
  const lastReviewMap = new Map<string, string>();
  for (const r of completedResult.data ?? []) {
    if (!lastReviewMap.has(r.family_id)) {
      lastReviewMap.set(r.family_id, r.completed_at);
    }
  }

  // Most recent draft request per family
  const draftMap = new Map<
    string,
    { requested_at: string | null; token_expires_at: string | null; opened_at: string | null }
  >();
  for (const d of draftResult.data ?? []) {
    if (!draftMap.has(d.family_id)) {
      draftMap.set(d.family_id, {
        requested_at: d.requested_at,
        token_expires_at: d.token_expires_at,
        opened_at: d.opened_at,
      });
    }
  }

  const now = new Date();

  const rows = allFamilies.map((family) => {
    const registrationDate: string | null =
      family.visit_date ?? family.created_at?.slice(0, 10) ?? null;
    const lastReviewedAt: string | null = lastReviewMap.get(family.id) ?? null;
    const familyName = `${family.parent1_last_name} Family`;
    const primaryParent =
      [family.parent1_first_name, family.parent1_last_name].filter(Boolean).join(" ");

    // Draft request metadata
    const draft = draftMap.get(family.id) ?? null;
    let requestStatus: "none" | "pending" | "opened" | "expired" = "none";
    if (draft) {
      const expired = !draft.token_expires_at || new Date(draft.token_expires_at) < now;
      if (expired) {
        requestStatus = "expired";
      } else if (draft.opened_at) {
        requestStatus = "opened";
      } else {
        requestStatus = "pending";
      }
    }

    if (!registrationDate) {
      return {
        id: family.id,
        family_name: familyName,
        primary_parent: primaryParent,
        primary_email: family.parent1_email ?? null,
        registration_date: null as string | null,
        last_reviewed_at: null as string | null,
        next_due_date: null as string | null,
        days_until_due: null as number | null,
        days_past_due: null as number | null,
        status: "needs_baseline" as const,
        request_status: requestStatus,
        draft_requested_at: draft?.requested_at ?? null,
        draft_expires_at: draft?.token_expires_at ?? null,
        draft_opened_at: draft?.opened_at ?? null,
      };
    }

    const rs = getReviewStatus(registrationDate, lastReviewedAt, now);

    return {
      id: family.id,
      family_name: familyName,
      primary_parent: primaryParent,
      primary_email: family.parent1_email ?? null,
      registration_date: registrationDate,
      last_reviewed_at: lastReviewedAt,
      next_due_date: rs.dueDate.toISOString().slice(0, 10),
      days_until_due: rs.daysUntilDue,
      days_past_due: rs.daysPastDue,
      status: rs.status as "current" | "due_soon" | "due" | "overdue",
      request_status: requestStatus,
      draft_requested_at: draft?.requested_at ?? null,
      draft_expires_at: draft?.token_expires_at ?? null,
      draft_opened_at: draft?.opened_at ?? null,
    };
  });

  const counts = {
    current:        rows.filter((r) => r.status === "current").length,
    due_soon:       rows.filter((r) => r.status === "due_soon").length,
    due:            rows.filter((r) => r.status === "due").length,
    overdue:        rows.filter((r) => r.status === "overdue").length,
    needs_baseline: rows.filter((r) => r.status === "needs_baseline").length,
  };

  let filtered = rows;
  if (statusFilter !== "all") {
    filtered = rows.filter((r) => r.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.family_name.toLowerCase().includes(search) ||
        r.primary_parent.toLowerCase().includes(search) ||
        (r.primary_email ?? "").toLowerCase().includes(search),
    );
  }

  return Response.json({ families: filtered, counts, total: filtered.length });
}
