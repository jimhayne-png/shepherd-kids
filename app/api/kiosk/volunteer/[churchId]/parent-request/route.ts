import { type NextRequest } from "next/server";
import { adminClient } from "@/lib/api-auth";
import { sendParentRequestSms } from "@/lib/communications/sms/sendParentRequest";
import { hashSessionToken } from "@/lib/crypto/token";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;

  try {
    const body = await request.json();
    const checkinRecordId = String(body.checkinRecordId ?? "").trim();

    if (!checkinRecordId) {
      return Response.json({ error: "checkinRecordId is required" }, { status: 400 });
    }

    const admin = adminClient();

    // Resolve volunteer session from HttpOnly cookie (may be absent for PIN-gate kiosk)
    const rawToken = request.cookies.get("vk_session")?.value ?? null;
    let volunteerSession: { id: string; volunteer_id: string; room_id: string } | null = null;

    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      const { data: vs } = await admin
        .from("cm_volunteer_sessions")
        .select("id, volunteer_id, room_id, church_id, expires_at, revoked_at")
        .eq("session_token_hash", tokenHash)
        .eq("church_id", churchId)
        .maybeSingle();

      if (vs && !vs.revoked_at && new Date(vs.expires_at) > new Date()) {
        volunteerSession = { id: vs.id, volunteer_id: vs.volunteer_id, room_id: vs.room_id };
      }
    }

    const { data: record, error } = await admin
      .from("cm_checkin_records")
      .select("id, session_id, child_name, parent_name, parent_phone, room_id, church_id")
      .eq("id", checkinRecordId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (error || !record) {
      return Response.json(
        { error: error?.message ?? "Check-in record not found." },
        { status: 404 }
      );
    }

    const parentPhone = (record as { parent_phone?: string }).parent_phone ?? null;

    if (!parentPhone) {
      return Response.json(
        { error: "No parent phone number found for this check-in record." },
        { status: 400 }
      );
    }

    const { data: church } = await admin
      .from("churches")
      .select("name")
      .eq("id", churchId)
      .maybeSingle();

    const sentByName = volunteerSession
      ? "Classroom Volunteer (Vetted)"
      : "Classroom Volunteer";

    const result = await sendParentRequestSms({
      churchId,
      churchName: (church as { name?: string } | null)?.name ?? "Children's Ministry",
      checkinRecordId: record.id,
      childName: (record as { child_name?: string }).child_name ?? "Child",
      parentName: (record as { parent_name?: string }).parent_name ?? "Parent",
      parentPhone,
      sentByUserId: volunteerSession?.volunteer_id ?? null,
      sentByName,
    });

    // Write to cm_parent_requests for admin audit visibility
    await admin.from("cm_parent_requests").insert({
      church_id: churchId,
      checkin_record_id: record.id,
      session_id: (record as { session_id?: string }).session_id ?? "unknown",
      parent_phone: parentPhone,
      child_name: (record as { child_name?: string }).child_name ?? "",
      sent_by: volunteerSession?.volunteer_id ?? null,
      source: volunteerSession ? "volunteer_scan" : "classroom",
      volunteer_id: volunteerSession?.volunteer_id ?? null,
      volunteer_session_id: volunteerSession?.id ?? null,
      room_id: volunteerSession?.room_id ?? (record as { room_id?: string }).room_id ?? null,
      delivery_status: "sent",
    });

    return Response.json(result);
  } catch (err) {
    console.error("[Volunteer Parent Request SMS] Failed:", err);

    return Response.json(
      {
        error: "Failed to send parent request.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
