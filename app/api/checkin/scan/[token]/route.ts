import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const admin = adminClient();

  const { data: record, error } = await admin
    .from("cm_checkin_records")
    .select(
      "id, church_id, session_id, child_name, parent_name, parent_phone, room_id, security_code, allergies, allergy_other, medical_notes, authorized_pickups, date_of_birth, checked_in_at",
    )
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !record) {
    // Debug: check both tables so we can identify token-mismatch vs missing-column issues.
    const tokenPrefix = (token ?? "").slice(0, 6);
    const tokenLength = (token ?? "").length;

    const [{ data: printJobMatch, error: printJobError }, { data: checkinMatch, error: checkinError }] =
      await Promise.all([
        admin.from("cm_label_print_jobs").select("id").eq("qr_token", token).maybeSingle(),
        admin.from("cm_checkin_records").select("id").eq("qr_token", token).maybeSingle(),
      ]);

    console.error("[scan:not_found]", {
      tokenLength,
      tokenPrefix,
      queryError: error?.message ?? null,
      inCheckinRecords: !!checkinMatch,
      checkinLookupError: checkinError?.message ?? null,
      inPrintJobs: !!printJobMatch,
      printJobLookupError: printJobError?.message ?? null,
    });

    await admin.from("cm_label_scan_log").insert({
      church_id: auth.churchId,
      qr_token: token,
      result: "not_found",
      scanned_by: auth.userId,
    });
    return Response.json({ result: "not_found" }, { status: 404 });
  }

  if (record.church_id !== auth.churchId) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Run session, room, and visitor family lookups in parallel.
  // Family lookup enables fetching special_instructions from cm_visitor_children.
  const [
    { data: session },
    { data: roomRow },
    { data: family },
  ] = await Promise.all([
    admin
      .from("cm_checkin_sessions")
      .select("id, service_name, status, closed_at, label_expiry_minutes")
      .eq("id", record.session_id)
      .maybeSingle(),
    record.room_id
      ? admin.from("cm_checkin_rooms").select("name").eq("id", record.room_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    record.parent_phone
      ? admin
          .from("cm_visitor_families")
          .select("id")
          .eq("church_id", record.church_id)
          .eq("parent1_phone", record.parent_phone)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Fetch visitor child to get special_instructions (not stored in cm_checkin_records).
  // medical_notes: prefer checkin record, fall back to visitor child.
  let specialInstructions: string | null = null;
  let medicalNotes: string | null = (record.medical_notes as string | null)?.trim() || null;

  if (family) {
    const nameParts = (record.child_name as string ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    const { data: visitorChild } = await admin
      .from("cm_visitor_children")
      .select("special_instructions, medical_notes")
      .eq("family_id", (family as { id: string }).id)
      .eq("first_name", firstName)
      .eq("last_name", lastName)
      .maybeSingle();

    if (visitorChild) {
      const vc = visitorChild as { special_instructions?: string | null; medical_notes?: string | null };
      specialInstructions = vc.special_instructions?.trim() || null;
      if (!medicalNotes && vc.medical_notes?.trim()) {
        medicalNotes = vc.medical_notes.trim();
      }
    }
  }

  let result: "valid" | "expired" = "valid";
  let expiredReason: string | null = null;

  if (session && session.status === "closed") {
    const expiryMinutes: number = session.label_expiry_minutes ?? 15;
    if (expiryMinutes !== 0) {
      const closedAt = session.closed_at ? new Date(session.closed_at) : null;
      if (!closedAt) {
        result = "expired";
        expiredReason = "Session has ended";
      } else {
        const elapsed = Date.now() - closedAt.getTime();
        if (elapsed > expiryMinutes * 60 * 1000) {
          result = "expired";
          expiredReason = `Session ended more than ${expiryMinutes} minutes ago`;
        }
      }
    }
  }

  const roomName = (roomRow as { name: string } | null)?.name ?? null;

  await admin.from("cm_label_scan_log").insert({
    church_id: auth.churchId,
    qr_token: token,
    checkin_record_id: record.id,
    session_id: record.session_id,
    result,
    scanned_by: auth.userId,
  });

  return Response.json({
    result,
    expiredReason,
    session: session
      ? { name: (session as { service_name?: string }).service_name ?? null, status: session.status }
      : null,
    child: {
      name: record.child_name,
      dateOfBirth: record.date_of_birth,
      roomName,
      securityCode: record.security_code,
      allergies: record.allergies,
      allergyOther: record.allergy_other,
      medicalNotes,
      specialInstructions,
      authorizedPickups: record.authorized_pickups,
    },
    parent: {
      name: record.parent_name,
      phone: record.parent_phone,
    },
    checkinRecordId: record.id,
    checkedInAt: record.checked_in_at,
  });
}
