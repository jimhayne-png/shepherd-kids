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

export async function sendSms({
  gateway,
  phone,
  message,
}: {
  gateway: SmsGateway;
  phone: string;
  message: string;
}): Promise<{
  success: boolean;
  providerMessageId?: string | null;
  error?: string;
}> {
  try {
    if (!process.env.GHL_API_KEY) {
      return {
        success: false,
        error: "Missing GHL_API_KEY.",
      };
    }

    if (!gateway.location_id) {
      return {
        success: false,
        error: "SMS gateway is missing location_id.",
      };
    }

    if (!gateway.phone_number_sid) {
      return {
        success: false,
        error: "SMS gateway is missing phone_number_sid.",
      };
    }

    const response = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: "v3",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "SMS",
        locationId: gateway.location_id,
        phoneNumberId: gateway.phone_number_sid,
        contactPhone: phone,
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