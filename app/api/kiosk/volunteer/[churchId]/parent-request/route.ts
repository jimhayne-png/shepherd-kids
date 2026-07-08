import { type NextRequest } from "next/server";
import { adminClient } from "@/lib/api-auth";
import { sendParentRequestSms } from "@/lib/communications/sms/sendParentRequest";

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

    const { data: record, error } = await admin
      .from("cm_checkin_records")
      .select("*")
      .eq("id", checkinRecordId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (error || !record) {
      return Response.json(
        { error: error?.message ?? "Check-in record not found." },
        { status: 404 }
      );
    }

    const parentPhone =
      record.parent_phone ||
      record.phone ||
      record.parent_mobile ||
      record.mobile_phone ||
      null;

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

    const result = await sendParentRequestSms({
      churchId,
      churchName: church?.name ?? "Children's Ministry",
      childId: record.child_id ?? record.childId ?? null,
      checkinRecordId: record.id,
      childName: record.child_name ?? "Child",
      parentName: record.parent_name ?? "Parent",
      parentPhone,
      sentByUserId: null,
      sentByName: "Classroom Volunteer",
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