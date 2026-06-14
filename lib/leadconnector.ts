/**
 * LeadConnector / GoHighLevel messaging client.
 *
 * Server-side only — never import this from a client component or any file
 * that is transitively imported by one. All env vars here are non-NEXT_PUBLIC
 * and are therefore never bundled for the browser.
 */

const LC_BASE = "https://services.leadconnectorhq.com";

// ── Error codes ──────────────────────────────────────────────────────────────

export type LcErrorCode =
  | "env_missing"       // one or more required env vars not set
  | "invalid_token"     // 401 — API key rejected
  | "missing_contact"   // contactId not found or not provided
  | "invalid_from_number"  // fromNumber rejected (wrong format, not owned by location)
  | "unverified_number" // toll-free number not yet verified / pending A2P
  | "api_error"         // any other non-2xx from LC
  | "network_error";    // fetch failed entirely (DNS, timeout, etc.)

export type LcSmsResult =
  | { ok: true;  messageId: string; raw: unknown }
  | { ok: false; code: LcErrorCode; message: string; raw: unknown };

// ── Config resolution ────────────────────────────────────────────────────────

interface LcConfig {
  apiKey: string;
  locationId: string;
  fromNumber: string;
}

function resolveLcConfig(): LcConfig | null {
  const apiKey     = process.env.LEADCONNECTOR_API_KEY;
  const locationId = process.env.LEADCONNECTOR_LOCATION_ID;
  const fromNumber = process.env.LEADCONNECTOR_FROM_NUMBER;

  if (!apiKey || !locationId || !fromNumber) return null;
  return { apiKey, locationId, fromNumber };
}

/** Returns true if all required LC env vars are present. */
export function lcIsConfigured(): boolean {
  return resolveLcConfig() !== null;
}

/**
 * Returns the names of any missing required env vars.
 * Useful for returning a clear error to callers before attempting a send.
 */
export function lcMissingVars(): string[] {
  const missing: string[] = [];
  if (!process.env.LEADCONNECTOR_API_KEY)      missing.push("LEADCONNECTOR_API_KEY");
  if (!process.env.LEADCONNECTOR_LOCATION_ID)  missing.push("LEADCONNECTOR_LOCATION_ID");
  if (!process.env.LEADCONNECTOR_FROM_NUMBER)  missing.push("LEADCONNECTOR_FROM_NUMBER");
  return missing;
}

// ── SMS send ─────────────────────────────────────────────────────────────────

/**
 * Sends an SMS via the LeadConnector Conversations API.
 *
 * @param contactId   GHL contact ID for the recipient
 * @param message     Full message body (already interpolated)
 */
export async function lcSendSms(
  contactId: string,
  message: string,
): Promise<LcSmsResult> {
  // 1. Env var validation
  const missing = lcMissingVars();
  if (missing.length > 0) {
    const detail = `Missing env vars: ${missing.join(", ")}`;
    console.error("[LeadConnector] env_missing —", detail);
    return { ok: false, code: "env_missing", message: detail, raw: null };
  }

  const config = resolveLcConfig()!;

  // 2. contactId guard
  if (!contactId?.trim()) {
    const detail = "contactId is required and must be a non-empty string";
    console.error("[LeadConnector] missing_contact —", detail);
    return { ok: false, code: "missing_contact", message: detail, raw: null };
  }

  // 3. Build payload exactly as specified
  const payload = {
    type: "SMS",
    contactId: contactId.trim(),
    message,
    fromNumber: config.fromNumber,
    status: "sent",
  };

  console.log("[LeadConnector] Sending SMS →", {
    contactId: payload.contactId,
    fromNumber: payload.fromNumber,
    messageLength: message.length,
  });

  // 4. HTTP call
  let res: Response;
  try {
    res = await fetch(`${LC_BASE}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[LeadConnector] network_error —", detail);
    return { ok: false, code: "network_error", message: `Network error: ${detail}`, raw: null };
  }

  // 5. Parse response body (may not be JSON on some error paths)
  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  // 6. Success path
  if (res.ok) {
    const r = raw as Record<string, unknown> | null;
    const messageId = (r?.id ?? r?.messageId ?? r?.conversationId ?? "unknown") as string;
    console.log("[LeadConnector] SMS sent — messageId:", messageId);
    return { ok: true, messageId, raw };
  }

  // 7. Map known error shapes to typed codes
  const body = raw as Record<string, unknown> | null;
  const errMsg = String(body?.message ?? body?.error ?? body?.msg ?? `HTTP ${res.status}`);
  const lower = errMsg.toLowerCase();

  console.error(`[LeadConnector] HTTP ${res.status} —`, errMsg, "| raw:", raw);

  if (res.status === 401) {
    return {
      ok: false,
      code: "invalid_token",
      message: `API token rejected (401): ${errMsg}`,
      raw,
    };
  }

  if (res.status === 400 || res.status === 422) {
    // Unverified / toll-free pending
    if (
      lower.includes("verif") ||
      lower.includes("unverified") ||
      lower.includes("toll-free") ||
      lower.includes("toll free") ||
      lower.includes("not approved") ||
      lower.includes("pending")
    ) {
      return {
        ok: false,
        code: "unverified_number",
        message: `From number is not verified for A2P sending: ${errMsg}`,
        raw,
      };
    }

    // Bad from number
    if (
      lower.includes("from") ||
      (lower.includes("number") && !lower.includes("contact"))
    ) {
      return {
        ok: false,
        code: "invalid_from_number",
        message: `From number rejected by LeadConnector: ${errMsg}`,
        raw,
      };
    }

    // Contact not found
    if (lower.includes("contact")) {
      return {
        ok: false,
        code: "missing_contact",
        message: `Contact not found in LeadConnector: ${errMsg}`,
        raw,
      };
    }
  }

  // Catch-all
  return {
    ok: false,
    code: "api_error",
    message: `LeadConnector API error (${res.status}): ${errMsg}`,
    raw,
  };
}

// ── Phone normalization ───────────────────────────────────────────────────────

/** Converts a stored phone number to E.164 (+1XXXXXXXXXX for US). */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`; // international
  return null;
}

// ── Contact lookup / create ───────────────────────────────────────────────────

type LcContactResult =
  | { ok: true; contactId: string }
  | { ok: false; code: LcErrorCode; message: string };

/**
 * Finds a GHL contact by phone number, creating one if not found.
 * Uses the location-scoped contacts search API.
 */
export async function lcFindOrCreateContact(
  phone: string,
  name: string,
): Promise<LcContactResult> {
  const config = resolveLcConfig();
  if (!config) {
    return { ok: false, code: "env_missing", message: "LeadConnector not configured" };
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return {
      ok: false,
      code: "invalid_from_number",
      message: `Cannot normalize phone to E.164: "${phone}"`,
    };
  }

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };

  // 1. Search for an existing contact by phone number
  try {
    const searchUrl = `${LC_BASE}/contacts/?locationId=${encodeURIComponent(config.locationId)}&query=${encodeURIComponent(normalized)}&limit=20`;
    const searchRes = await fetch(searchUrl, { headers });

    if (searchRes.ok) {
      const data = (await searchRes.json()) as {
        contacts?: Array<{ id: string; phone?: string }>;
      };

      const contacts = data.contacts ?? [];
      // Find an exact phone match after normalizing the stored number
      const match = contacts.find((c) => {
        if (!c.phone) return false;
        return normalizePhone(c.phone) === normalized;
      });

      if (match) {
        console.log("[LeadConnector] Contact found by phone:", match.id);
        return { ok: true, contactId: match.id };
      }
    } else {
      console.warn("[LeadConnector] Contact search returned", searchRes.status, "— proceeding to create");
    }
  } catch (err) {
    console.warn("[LeadConnector] Contact search network error — proceeding to create:", err);
  }

  // 2. Create a minimal contact
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "Parent";
  const lastName = parts.slice(1).join(" ") || undefined;

  try {
    const createRes = await fetch(`${LC_BASE}/contacts/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstName,
        ...(lastName ? { lastName } : {}),
        phone: normalized,
        locationId: config.locationId,
      }),
    });

    const createData = (await createRes.json()) as {
      contact?: { id: string };
      id?: string;
      message?: string;
    };

    const contactId = createData?.contact?.id ?? createData?.id;

    if (createRes.ok && contactId) {
      console.log("[LeadConnector] Contact created:", contactId);
      return { ok: true, contactId };
    }

    const errMsg = createData?.message ?? `HTTP ${createRes.status}`;
    console.error("[LeadConnector] Contact create failed:", errMsg);
    return { ok: false, code: "api_error", message: `Failed to create GHL contact: ${errMsg}` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[LeadConnector] Contact create network error:", detail);
    return { ok: false, code: "network_error", message: `Network error creating contact: ${detail}` };
  }
}

/**
 * High-level: send an SMS to a phone number.
 * Looks up or creates a GHL contact for the number, then sends via Conversations API.
 */
export async function lcSendSmsToPhone(
  toPhone: string,
  parentName: string,
  message: string,
): Promise<LcSmsResult> {
  const contactResult = await lcFindOrCreateContact(toPhone, parentName);
  if (!contactResult.ok) {
    return { ok: false, code: contactResult.code, message: contactResult.message, raw: null };
  }
  return lcSendSms(contactResult.contactId, message);
}

// ── Payload preview (dry-run helper) ─────────────────────────────────────────

/**
 * Returns the exact payload that would be sent without making any HTTP call.
 * Use this to verify configuration before a live test.
 */
export function lcPreviewPayload(contactId: string, message: string) {
  const config = resolveLcConfig();
  return {
    endpoint: `POST ${LC_BASE}/conversations/messages`,
    headers: {
      Authorization: config ? "Bearer [REDACTED]" : "(missing — LEADCONNECTOR_API_KEY not set)",
      "Content-Type": "application/json",
      Version: "2021-04-15",
    },
    payload: {
      type: "SMS",
      contactId: contactId || "(missing — LEADCONNECTOR_TEST_CONTACT_ID not set)",
      message,
      fromNumber: config?.fromNumber ?? "(missing — LEADCONNECTOR_FROM_NUMBER not set)",
      status: "sent",
    },
    configStatus: {
      apiKey:     !!process.env.LEADCONNECTOR_API_KEY,
      locationId: !!process.env.LEADCONNECTOR_LOCATION_ID,
      fromNumber: !!process.env.LEADCONNECTOR_FROM_NUMBER,
    },
    missingVars: lcMissingVars(),
  };
}
