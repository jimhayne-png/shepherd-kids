import { type NextRequest } from "next/server";
import { getAuthContext, adminClient } from "@/lib/api-auth";
import { lcSendSmsToPhone } from "@/lib/leadconnector";

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let checkinRecordId: string;
  let source: "scan" | "classroom";
  try {
    const body = await request.json();
    checkinRecordId = body.checkinRecordId;
    source = body.source === "classroom" ? "classroom" : "scan";
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!checkinRecordId?.trim()) {
    return Response.json({ error: "checkinRecordId is required" }, { status: 400 });
  }

  const admin = adminClient();

  const { data: record, error: recordError } = await admin
    .from("cm_checkin_records")
    .select("id, church_id, session_id, parent_name, parent_phone, child_name")
    .eq("id", checkinRecordId)
    .maybeSingle();

  if (recordError || !record) {
    return Response.json({ error: "Check-in record not found" }, { status: 404 });
  }

  if (record.church_id !== auth.churchId) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!record.parent_phone?.trim()) {
    return Response.json({ error: "No parent phone number on file" }, { status: 422 });
  }

  // 10-minute cooldown
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("cm_parent_requests")
    .select("id, sent_at")
    .eq("checkin_record_id", checkinRecordId)
    .gte("sent_at", tenMinutesAgo)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const nextAllowed = new Date(new Date(recent.sent_at).getTime() + 10 * 60 * 1000);
    return Response.json(
      { error: "A text was already sent recently. Please wait before sending again.", cooldownUntil: nextAllowed.toISOString() },
      { status: 429 },
    );
  }

  const { data: church } = await admin
    .from("churches")
    .select("name")
    .eq("id", record.church_id)
    .maybeSingle();

  const churchName = (church as { name: string } | null)?.name ?? "Children's Ministry";
  const message = `${churchName} Children's Ministry is requesting that you come to your child's classroom. Please bring your parent pickup label with you.`;

  const smsResult = await lcSendSmsToPhone(record.parent_phone, record.parent_name ?? "Parent", message);

  if (!smsResult.ok) {
    console.error("[parent-request] SMS send failed:", smsResult.code, smsResult.message);
    return Response.json(
      { error: `Could not send text message: ${smsResult.message}`, code: smsResult.code },
      { status: 502 },
    );
  }

  await admin.from("cm_parent_requests").insert({
    church_id: record.church_id,
    checkin_record_id: record.id,
    session_id: record.session_id,
    parent_phone: record.parent_phone,
    child_name: record.child_name,
    sent_by: auth.userId,
    source,
    delivery_status: "sent",
  });

  return Response.json({ success: true, sentAt: new Date().toISOString() });
}
