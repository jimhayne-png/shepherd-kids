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
      "id, church_id, session_id, child_name, parent_name, parent_phone, room_id, security_code, allergies, allergy_other, medical_notes, special_instructions, authorized_pickups, date_of_birth, checked_in_at",
    )
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !record) {
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

  const { data: session } = await admin
    .from("cm_checkin_sessions")
    .select("id, service_name, status, closed_at, label_expiry_minutes")
    .eq("id", record.session_id)
    .maybeSingle();

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

  let roomName: string | null = null;
  if (record.room_id) {
    const { data: room } = await admin
      .from("cm_checkin_rooms")
      .select("name")
      .eq("id", record.room_id)
      .maybeSingle();
    roomName = (room as { name: string } | null)?.name ?? null;
  }

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
      medicalNotes: record.medical_notes,
      specialInstructions: record.special_instructions,
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
