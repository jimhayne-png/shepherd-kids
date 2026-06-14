"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ScanResult = {
  result: "valid" | "expired" | "not_found";
  expiredReason: string | null;
  session: { name: string | null; status: string } | null;
  child: {
    name: string;
    dateOfBirth: string | null;
    roomName: string | null;
    securityCode: string;
    allergies: string[] | null;
    allergyOther: string | null;
    medicalNotes: string | null;
    specialInstructions: string | null;
    authorizedPickups: string | null;
  };
  parent: { name: string; phone: string | null };
  checkinRecordId: string;
  checkedInAt: string;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function allergyList(allergies: string[] | null, allergyOther: string | null): string | null {
  const items = (allergies ?? []).map((a) =>
    a === "Other" && allergyOther ? `Other: ${allergyOther}` : a,
  );
  return items.length ? items.join(", ") : null;
}

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScanResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        router.push(`/?redirect=/dashboard/children-ministry/scan/${token}`);
        return;
      }
      const res = await fetch(`/api/checkin/scan/${token}`, { credentials: "include" });
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    if (token) init();
  }, [token, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
        <p style={{ color: "#A9A9B8", fontSize: 16 }}>Loading…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D", padding: 24 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>❓</p>
        <h1 style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Label not found</h1>
        <p style={{ color: "#A9A9B8", fontSize: 14, textAlign: "center" }}>This QR code could not be matched to a check-in record.</p>
      </div>
    );
  }

  const { result, expiredReason, child, parent, checkedInAt, checkinRecordId, session } = data;

  async function handleRequestParent() {
    if (requestState === "sending" || requestState === "sent") return;
    setRequestState("sending");
    setRequestError(null);
    try {
      const res = await fetch("/api/checkin/parent-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkinRecordId, source: "scan" }),
      });
      if (res.status === 429) {
        setRequestState("idle");
        setRequestError("A text was already sent. Please wait 10 minutes before sending again.");
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setRequestState("error");
        setRequestError((d as { error?: string }).error ?? "Failed to send text.");
        return;
      }
      setRequestState("sent");
    } catch {
      setRequestState("error");
      setRequestError("Network error — could not send text.");
    }
  }
  const isExpired = result === "expired";
  const allergyDisplay = allergyList(child.allergies, child.allergyOther);
  const hasCareNotes = !!(allergyDisplay || child.medicalNotes || child.specialInstructions);

  const statusBg = isExpired ? "#451a03" : "#052e16";
  const statusBorder = isExpired ? "#92400e" : "#14532d";
  const statusColor = isExpired ? "#fcd34d" : "#86efac";
  const statusLabel = isExpired ? "Expired" : "Valid";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#08060D", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Status badge */}
        <div style={{ backgroundColor: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{isExpired ? "⏱" : "✅"}</span>
          <div>
            <p style={{ color: statusColor, fontWeight: 700, fontSize: 15, margin: 0 }}>Check-In — {statusLabel}</p>
            {isExpired && expiredReason && (
              <p style={{ color: "#fcd34d", fontSize: 12, margin: "2px 0 0", opacity: 0.85 }}>{expiredReason}</p>
            )}
          </div>
        </div>

        {/* Child */}
        <div style={{ backgroundColor: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 20 }}>
          <p style={{ color: "#D4AF37", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>Child Information</p>
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, margin: "0 0 4px", fontFamily: "Georgia, serif" }}>{child.name}</h1>
          {child.roomName && (
            <span style={{ display: "inline-block", backgroundColor: "#7B2CBF", color: "#FFFFFF", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20, marginTop: 4 }}>
              {child.roomName}
            </span>
          )}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
            {session?.name && (
              <p style={{ color: "#A9A9B8", fontSize: 13, margin: 0 }}>Service: <span style={{ color: "#D8D8E8" }}>{session.name}</span></p>
            )}
            <p style={{ color: "#A9A9B8", fontSize: 13, margin: 0 }}>Checked in: <span style={{ color: "#D8D8E8" }}>{fmtTime(checkedInAt)}</span></p>
            {child.dateOfBirth && (
              <p style={{ color: "#A9A9B8", fontSize: 13, margin: 0 }}>Date of birth: <span style={{ color: "#D8D8E8" }}>{child.dateOfBirth}</span></p>
            )}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(212,175,55,0.15)" }}>
            <p style={{ color: "#A9A9B8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Pickup Code</p>
            <p style={{ color: "#D4AF37", fontSize: 32, fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.18em", margin: 0 }}>{child.securityCode}</p>
          </div>
        </div>

        {/* Care Notes */}
        {hasCareNotes && (
          <div style={{ backgroundColor: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 16, padding: 20 }}>
            <p style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Care Notes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allergyDisplay && (
                <div style={{ backgroundColor: "#dc2626", borderRadius: 8, padding: "8px 12px" }}>
                  <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13, margin: 0 }}>ALLERGY: {allergyDisplay}</p>
                </div>
              )}
              {child.medicalNotes && (
                <div>
                  <p style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700, textTransform: "uppercase", margin: "0 0 2px" }}>Medical</p>
                  <p style={{ color: "#fecaca", fontSize: 14, margin: 0 }}>{child.medicalNotes}</p>
                </div>
              )}
              {child.specialInstructions && (
                <div>
                  <p style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700, textTransform: "uppercase", margin: "0 0 2px" }}>Special Instructions</p>
                  <p style={{ color: "#fecaca", fontSize: 14, margin: 0 }}>{child.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parent Information */}
        <div style={{ backgroundColor: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 20 }}>
          <p style={{ color: "#D4AF37", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>Parent Information</p>
          <p style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{parent.name}</p>
          {parent.phone && (
            <>
              <p style={{ color: "#A9A9B8", fontSize: 14, margin: "0 0 14px" }}>{parent.phone}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <a
                  href={`tel:${parent.phone}`}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", backgroundColor: "#7B2CBF", color: "#FFFFFF", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}
                >
                  Call Parent
                </a>
                <button
                  onClick={handleRequestParent}
                  disabled={requestState === "sending" || requestState === "sent"}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", backgroundColor: requestState === "sent" ? "#14532d" : "#1a2e1a", border: `1px solid ${requestState === "sent" ? "#4ade80" : "#4ade80"}`, color: "#4ade80", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: requestState === "sending" || requestState === "sent" ? "default" : "pointer", opacity: requestState === "sending" ? 0.6 : 1 }}
                >
                  {requestState === "sending" ? "Sending…" : requestState === "sent" ? "Text Sent ✓" : "Request Parent"}
                </button>
              </div>
              {requestError && (
                <p style={{ color: "#fca5a5", fontSize: 12, margin: "6px 0 0", textAlign: "center" }}>{requestError}</p>
              )}
            </>
          )}
        </div>

        {/* Authorized Pickups */}
        {child.authorizedPickups && (
          <div style={{ backgroundColor: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 20 }}>
            <p style={{ color: "#D4AF37", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>Authorized Pickups</p>
            <p style={{ color: "#D8D8E8", fontSize: 14, margin: 0, lineHeight: 1.5 }}>{child.authorizedPickups}</p>
          </div>
        )}

      </div>
    </div>
  );
}
