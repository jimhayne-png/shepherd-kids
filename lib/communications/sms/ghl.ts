const GHL_BASE = "https://services.leadconnectorhq.com";

export type SmsGateway = {
  id: string;
  provider: "gohighlevel";
  type: "sms";
  name: string;
  location_id: string | null;
  phone_number: string | null;
  phone_number_sid: string | null;
  estimated_cost: number | null;
};

async function upsertParentContact({
  apiKey,
  locationId,
  parentName,
  phone,
}: {
  apiKey: string;
  locationId: string;
  parentName: string;
  phone: string;
}): Promise<string> {
  const nameParts = parentName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Parent";
  const lastName = nameParts.slice(1).join(" ");

  const response = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: "2021-07-28",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locationId,
      firstName,
      lastName,
      name: parentName || "Parent",
      phone,
      tags: ["ShepherdKids Parent"],
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json?.contact?.id) {
    console.error("[GHL Contact Upsert Error]", json);
    throw new Error(
      json?.message ??
        json?.error?.message ??
        "Unable to create or update GoHighLevel parent contact."
    );
  }

  return json.contact.id;
}

export async function sendSms({
  gateway,
  phone,
  parentName,
  message,
}: {
  gateway: SmsGateway;
  phone: string;
  parentName: string;
  message: string;
}): Promise<{
  success: boolean;
  providerMessageId?: string | null;
  error?: string;
}> {
  try {
    const apiKey = process.env.GHL_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Missing GHL_API_KEY." };
    }

    if (!gateway.location_id) {
      return { success: false, error: "SMS gateway missing location_id." };
    }

    if (!gateway.phone_number_sid) {
      return { success: false, error: "SMS gateway missing phone_number_sid." };
    }

    const contactId = await upsertParentContact({
      apiKey,
      locationId: gateway.location_id,
      parentName,
      phone,
    });

    const response = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "v3",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "SMS",
        locationId: gateway.location_id,
        phoneNumberId: gateway.phone_number_sid,
        contactId,
        message,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[GHL SMS Error]", json);

      return {
        success: false,
        error:
          json?.message ??
          json?.error?.message ??
          json?.error ??
          "Unknown GoHighLevel SMS error.",
      };
    }

    return {
      success: true,
      providerMessageId:
        json?.messageId ??
        json?.id ??
        json?.conversationId ??
        null,
    };
  } catch (err) {
    console.error("[GHL SMS Exception]", err);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown SMS error.",
    };
  }
}