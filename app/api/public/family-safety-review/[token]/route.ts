import { type NextRequest } from "next/server";
import { adminClient } from "@/lib/api-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseAllergiesForDisplay(raw: string | null): string {
  if (!raw) return "";
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.join(", ") : raw;
  } catch {
    return raw;
  }
}

// ── GET: validate token and return form data ────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  if (!rawToken) return Response.json({ error: "invalid_token" }, { status: 404 });

  const tokenHash = hashToken(rawToken);
  const admin = adminClient();

  const { data: review } = await admin
    .from("cm_family_safety_reviews")
    .select("id, church_id, family_id, status, token_expires_at, opened_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!review) return Response.json({ error: "invalid_token" }, { status: 404 });

  if (review.status === "completed") {
    return Response.json({ error: "already_completed" }, { status: 410 });
  }

  if (!review.token_expires_at || new Date(review.token_expires_at) < new Date()) {
    return Response.json({ error: "expired" }, { status: 410 });
  }

  // Record first open — use church_id + family_id from the review row; never trust caller
  if (!review.opened_at) {
    await admin
      .from("cm_family_safety_reviews")
      .update({ opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", review.id);
  }

  const { data: family } = await admin
    .from("cm_visitor_families")
    .select(
      "id, parent1_first_name, parent1_last_name, parent1_email, parent1_phone, " +
      "parent2_first_name, parent2_last_name, parent2_email, parent2_phone, " +
      "address, city, state, zip, emergency_contact_name, emergency_contact_phone",
    )
    .eq("id", review.family_id)
    .eq("church_id", review.church_id)
    .maybeSingle();

  if (!family) return Response.json({ error: "invalid_token" }, { status: 404 });

  const { data: rawChildren } = await admin
    .from("cm_visitor_children")
    .select(
      "id, first_name, last_name, date_of_birth, grade, allergies, " +
      "medical_notes, special_instructions, authorized_pickups, photo_permission_status",
    )
    .eq("family_id", review.family_id)
    .eq("church_id", review.church_id)
    .order("date_of_birth", { ascending: true });

  // Normalize allergies from JSON.stringify(string[]) to comma-separated display text
  const children = (rawChildren ?? []).map((c) => {
    const child = c as unknown as {
      id: string; first_name: string; last_name: string;
      date_of_birth: string | null; grade: string | null;
      allergies: string | null; medical_notes: string | null;
      special_instructions: string | null; authorized_pickups: string | null;
      photo_permission_status: string;
    };
    return {
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name,
      date_of_birth: child.date_of_birth ?? "",
      grade: child.grade ?? "",
      allergies: parseAllergiesForDisplay(child.allergies),
      medical_notes: child.medical_notes ?? "",
      special_instructions: child.special_instructions ?? "",
      authorized_pickups: child.authorized_pickups ?? "",
      photo_permission_status: child.photo_permission_status,
    };
  });

  // Internal IDs are included so the form can reference them during submission,
  // but church_id, token_hash, and audit internals are never returned.
  return Response.json({ family, children });
}

// ── POST: validate, apply updates, mark complete ────────────────────────────

type ChildUpdate = {
  id: string;
  date_of_birth: string | null;
  grade: string;
  allergies: string;
  medical_notes: string;
  special_instructions: string;
  authorized_pickups: string;
  photo_permission_status: "granted" | "denied";
};

type FamilyUpdate = {
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_email: string;
  parent1_phone: string;
  parent2_first_name: string;
  parent2_last_name: string;
  parent2_email: string;
  parent2_phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FAMILY_FIELDS: (keyof FamilyUpdate)[] = [
  "parent1_first_name", "parent1_last_name", "parent1_email", "parent1_phone",
  "parent2_first_name", "parent2_last_name", "parent2_email", "parent2_phone",
  "address", "city", "state", "zip",
  "emergency_contact_name", "emergency_contact_phone",
];

const CHILD_FIELDS: (keyof ChildUpdate)[] = [
  "date_of_birth", "grade", "allergies", "medical_notes",
  "special_instructions", "authorized_pickups", "photo_permission_status",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  if (!rawToken) return Response.json({ error: "invalid_token" }, { status: 404 });

  const tokenHash = hashToken(rawToken);
  const admin = adminClient();

  // Revalidate token server-side — never trust browser-provided IDs
  const { data: review } = await admin
    .from("cm_family_safety_reviews")
    .select("id, church_id, family_id, status, token_expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!review) return Response.json({ error: "invalid_token" }, { status: 404 });
  if (review.status === "completed") {
    return Response.json({ error: "already_completed" }, { status: 410 });
  }
  if (!review.token_expires_at || new Date(review.token_expires_at) < new Date()) {
    return Response.json({ error: "expired" }, { status: 410 });
  }

  const body = await request.json();
  const {
    family: familyUpdates,
    children: childUpdates,
    confirmationAccepted,
    submittedName,
    submittedEmail,
  } = body as {
    family: FamilyUpdate;
    children: ChildUpdate[];
    confirmationAccepted: boolean;
    submittedName: string;
    submittedEmail: string;
  };

  // Basic validation
  if (!confirmationAccepted) {
    return Response.json({ error: "Confirmation required" }, { status: 400 });
  }
  if (!submittedName?.trim()) {
    return Response.json({ error: "Name required" }, { status: 400 });
  }
  if (!submittedEmail?.trim() || !EMAIL_RE.test(submittedEmail.trim())) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  // Load canonical family and children — source of truth for identity and comparison
  const { data: currentFamily } = await admin
    .from("cm_visitor_families")
    .select("*")
    .eq("id", review.family_id)
    .eq("church_id", review.church_id)
    .maybeSingle();

  if (!currentFamily) return Response.json({ error: "Family not found" }, { status: 404 });

  const { data: currentChildren } = await admin
    .from("cm_visitor_children")
    .select("*")
    .eq("family_id", review.family_id)
    .eq("church_id", review.church_id);

  const currentChildMap = new Map((currentChildren ?? []).map((c: Record<string, unknown>) => [c.id as string, c]));

  // All canonical children must be reviewed — reject submissions that skip any child
  const canonicalIds = new Set(currentChildMap.keys());
  const submittedIds = new Set((childUpdates ?? []).map((cu) => cu.id));

  for (const cid of canonicalIds) {
    if (!submittedIds.has(cid)) {
      return Response.json({ error: "All children must be reviewed" }, { status: 400 });
    }
  }
  for (const cid of submittedIds) {
    if (!canonicalIds.has(cid)) {
      return Response.json({ error: `Unknown child ID: ${cid}` }, { status: 400 });
    }
  }

  // Validate photo permission for every child — 'not_reviewed' is not an allowed submission value
  for (const cu of childUpdates ?? []) {
    if (!["granted", "denied"].includes(cu.photo_permission_status)) {
      return Response.json(
        { error: "Photo permission must be explicitly granted or denied for each child" },
        { status: 400 },
      );
    }
  }

  // Build change_summary — field names only, no sensitive values
  const familySummary: Record<string, { changed: boolean }> = {};
  let familyHadChanges = false;

  for (const field of FAMILY_FIELDS) {
    const oldVal = String((currentFamily as Record<string, unknown>)[field] ?? "");
    const newVal = String((familyUpdates as Record<string, unknown>)[field] ?? "");
    const changed = oldVal !== newVal;
    familySummary[field] = { changed };
    if (changed) familyHadChanges = true;
  }

  const childrenSummary: { child_id: string; fields_changed: string[] }[] = [];
  let childrenHadChanges = false;

  for (const cu of childUpdates ?? []) {
    const current = currentChildMap.get(cu.id) as Record<string, unknown> | undefined;
    const fieldsChanged: string[] = [];

    for (const field of CHILD_FIELDS) {
      const oldVal = String((current?.[field]) ?? "");
      const newVal = String((cu as Record<string, unknown>)[field] ?? "");
      if (oldVal !== newVal) {
        fieldsChanged.push(field);
        childrenHadChanges = true;
      }
    }

    childrenSummary.push({ child_id: cu.id, fields_changed: fieldsChanged });
  }

  const hadChanges = familyHadChanges || childrenHadChanges;
  const changeSummary = { family: familySummary, children: childrenSummary };

  // Single transactional RPC — all writes (family, children, completion, token invalidation)
  // execute inside one PostgreSQL transaction. Any failure rolls back the entire operation.
  const { error: rpcError } = await admin.rpc("complete_family_safety_review", {
    p_token_hash:      tokenHash,
    p_family:          familyUpdates,
    p_children:        childUpdates ?? [],
    p_submitted_name:  submittedName,
    p_submitted_email: submittedEmail,
    p_had_changes:     hadChanges,
    p_change_summary:  changeSummary,
  });

  if (rpcError) {
    const msg = rpcError.message ?? "";
    if (msg.includes("invalid_token"))         return Response.json({ error: "invalid_token" },         { status: 404 });
    if (msg.includes("already_completed"))     return Response.json({ error: "already_completed" },     { status: 410 });
    if (msg.includes("expired"))               return Response.json({ error: "expired" },               { status: 410 });
    if (msg.includes("missing_child"))         return Response.json({ error: "All children must be reviewed" }, { status: 400 });
    if (msg.includes("unknown_child"))         return Response.json({ error: "Unknown child in submission" },   { status: 400 });
    if (msg.includes("invalid_photo_permission")) return Response.json({ error: "Photo permission must be explicitly granted or denied for each child" }, { status: 400 });
    return Response.json({ error: "Submission failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
