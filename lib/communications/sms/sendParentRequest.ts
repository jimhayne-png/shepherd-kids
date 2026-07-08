import { adminClient } from "@/lib/api-auth";
import { sendSms } from "./ghl";

export interface SendParentRequestParams {
  churchId: string;
  churchName: string;
  childId?: string | null;
  checkinRecordId: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  sentByUserId?: string | null;
  sentByName?: string | null;
}

function buildParentRequestMessage(churchName: string): string {
  return `${churchName}: The Children's Ministry team is requesting that you come to your child's classroom. Please bring your parent pickup label with you. This is a one-way text message. We do not see responses.`;
}

export async function sendParentRequestSms(params: SendParentRequestParams) {
  const admin = adminClient();

  const { data: gateway, error: gatewayError } = await admin
    .from("communications_gateways")
    .select("*")
    .eq("provider", "gohighlevel")
    .eq("type", "sms")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (gatewayError || !gateway) {
    throw new Error(gatewayError?.message ?? "No active SMS gateway configured.");
  }

  const message = buildParentRequestMessage(params.churchName);

  const { data: log, error: logError } = await admin
    .from("communications_log")
    .insert({
      church_id: params.churchId,
      gateway_id: gateway.id,
      type: "sms",
      category: "parent_request",
      status: "queued",
      child_id: params.childId ?? null,
      checkin_record_id: params.checkinRecordId,
      recipient: params.parentPhone,
      recipient_name: params.parentName,
      cost: gateway.estimated_cost ?? 0.02,
      sent_by_user_id: params.sentByUserId ?? null,
      sent_by_name: params.sentByName ?? null,
    })
    .select("id")
    .single();

  if (logError || !log) {
    throw new Error(logError?.message ?? "Failed to create SMS log.");
  }

const result = await sendSms({
  gateway,
  phone: params.parentPhone,
  message,
});

  if (!result.success) {
    await admin
      .from("communications_log")
      .update({
        status: "failed",
        error_message: result.error ?? "SMS failed.",
      })
      .eq("id", log.id);

    throw new Error(result.error ?? "SMS failed.");
  }

  await admin
    .from("communications_log")
    .update({
      status: "sent",
      provider_message_id: result.providerMessageId ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", log.id);

  return {
    ok: true,
    logId: log.id,
    message,
  };
}