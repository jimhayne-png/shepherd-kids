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
    const now = new Date().toISOString();

    let volunteerSession: { id: string; volunteer_id: string; room_id: string } | null = null;
    let requestSource = "classroom";

    // ── Try vk_session (Smart Label scan on volunteer's personal phone) ──
    const rawScanToken = request.cookies.get("vk_session")?.value ?? null;
    if (rawScanToken) {
      const scanHash = hashSessionToken(rawScanToken);
      const { data: vs } = await admin
        .from("cm_volunteer_sessions")
        .select("id, volunteer_id, room_id, expires_at, revoked_at")
        .eq("session_token_hash", scanHash)
        .eq("church_id", churchId)
        .maybeSingle();

      if (vs && !vs.revoked_at && new Date(vs.expires_at) > new Date()) {
        volunteerSession = { id: vs.id, volunteer_id: vs.volunteer_id, room_id: vs.room_id };
        requestSource = "volunteer_scan";
      }
    }

    // ── Fallback: vk_tablet (Classroom Tablet — most recently signed-in active volunteer) ──
    if (!volunteerSession) {
      const rawTabletToken = request.cookies.get("vk_tablet")?.value ?? null;
      if (rawTabletToken) {
        const tabletHash = hashSessionToken(rawTabletToken);
        const { data: tablet } = await admin
          .from("cm_tablet_sessions")
          .select("id, expires_at, revoked_at")
          .eq("token_hash", tabletHash)
          .eq("church_id", churchId)
          .maybeSingle();

        type TabletRow = { id: string; expires_at: string; revoked_at: string | null };
        const tbl = tablet as unknown as TabletRow | null;

        if (tbl && !tbl.revoked_at && new Date(tbl.expires_at) > new Date()) {
          const { data: latestVs } = await admin
            .from("cm_volunteer_sessions")
            .select("id, volunteer_id, room_id")
            .eq("tablet_session_id", tbl.id)
            .eq("church_id", churchId)
            .is("revoked_at", null)
            .gt("expires_at", now)
            .order("issued_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          type VolSessRow = { id: string; volunteer_id: string; room_id: string };
          const lvs = latestVs as unknown as VolSessRow | null;
          if (lvs) {
            volunteerSession = { id: lvs.id, volunteer_id: lvs.volunteer_id, room_id: lvs.room_id };
            requestSource = "classroom_tablet";
          }
        }
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

    await admin.from("cm_parent_requests").insert({
      church_id: churchId,
      checkin_record_id: record.id,
      session_id: (record as { session_id?: string }).session_id ?? "unknown",
      parent_phone: parentPhone,
      child_name: (record as { child_name?: string }).child_name ?? "",
      sent_by: volunteerSession?.volunteer_id ?? null,
      source: requestSource,
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
