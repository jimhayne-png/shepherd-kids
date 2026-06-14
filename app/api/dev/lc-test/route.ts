/**
 * LeadConnector SMS proof-of-concept test route.
 *
 * Protected: requires a valid Shepherd Kids session (getAuthContext).
 * Never call this from client-side code — it only runs on the server.
 *
 * POST /api/dev/lc-test
 * Body: { dryRun?: boolean }   — defaults to TRUE (no SMS sent)
 *
 * Set dryRun: false only when you are ready to trigger a real SMS send.
 */

import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { lcPreviewPayload, lcSendSms, lcMissingVars } from "@/lib/leadconnector";

export async function POST(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const auth = await getAuthContext(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let dryRun = true; // safe default
  try {
    const body = await request.json();
    if (body?.dryRun === false) dryRun = false;
  } catch {
    // no body is fine — stays dry-run
  }

  // ── Test contact ID ───────────────────────────────────────────────────────
  const testContactId = process.env.LEADCONNECTOR_TEST_CONTACT_ID ?? "";

  // ── Message (matches the real Request Parent body) ────────────────────────
  const testMessage =
    "Community Church Children's Ministry is requesting that you come to your child's classroom. Please bring your parent pickup label with you.";

  // ── Env var pre-flight check ──────────────────────────────────────────────
  const missing = lcMissingVars();
  const missingContact = !testContactId;

  const configCheck = {
    LEADCONNECTOR_API_KEY:          !!process.env.LEADCONNECTOR_API_KEY,
    LEADCONNECTOR_LOCATION_ID:      !!process.env.LEADCONNECTOR_LOCATION_ID,
    LEADCONNECTOR_FROM_NUMBER:      !!process.env.LEADCONNECTOR_FROM_NUMBER,
    LEADCONNECTOR_TEST_CONTACT_ID:  !!testContactId,
    missingVars: [
      ...missing,
      ...(missingContact ? ["LEADCONNECTOR_TEST_CONTACT_ID"] : []),
    ],
  };

  // ── Dry-run: return payload preview without calling LC ────────────────────
  if (dryRun) {
    const preview = lcPreviewPayload(testContactId, testMessage);
    return Response.json({
      mode: "dry-run",
      note: "No SMS was sent. Pass { dryRun: false } in the request body to trigger a live send.",
      configCheck,
      ...preview,
    });
  }

  // ── Live send ─────────────────────────────────────────────────────────────
  if (missing.length > 0 || missingContact) {
    return Response.json(
      {
        mode: "live",
        error: "Cannot send — required env vars are missing",
        configCheck,
      },
      { status: 500 },
    );
  }

  console.log("[lc-test] Live send triggered by user:", auth.userId);

  const result = await lcSendSms(testContactId, testMessage);

  if (result.ok) {
    return Response.json({
      mode: "live",
      success: true,
      messageId: result.messageId,
      configCheck,
      raw: result.raw,
    });
  }

  return Response.json(
    {
      mode: "live",
      success: false,
      errorCode: result.code,
      errorMessage: result.message,
      configCheck,
      raw: result.raw,
    },
    { status: 400 },
  );
}
