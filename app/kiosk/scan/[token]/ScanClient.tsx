"use client";

import { useEffect, useState } from "react";

const ACCENT = "#F28C28";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type ScanResult = {
  result: "valid" | "expired" | "not_found" | "unauthorized";
  expiredReason?: string | null;
  churchId?: string;
  child?: {
    name: string;
    roomName: string | null;
    securityCode: string;
    isNewVisitor: boolean;
    allergies: string[] | null;
    allergyOther: string | null;
    medicalNotes: string | null;
    specialInstructions: string | null;
    authorizedPickups: string | null;
  };
  checkinRecordId?: string;
  checkedInAt?: string;
};

export default function ScanClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Session is carried by the HttpOnly vk_session cookie — no client storage needed.
    fetch(`/api/kiosk/scan/${token}`, { credentials: "same-origin" })
      .then(r => r.json())
      .then((data: ScanResult) => setScanResult(data))
      .catch(() => setScanResult({ result: "not_found" }))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleParentRequest(churchId: string, checkinRecordId: string) {
    setRequesting(true);
    try {
      await fetch(`/api/kiosk/volunteer/${churchId}/parent-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ checkinRecordId }),
      });
      setRequestSent(true);
    } catch {
      alert("Failed to send parent request.");
    }
    setRequesting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm" style={{ color: "#A9A9B8" }}>Verifying…</p>
        </div>
      </div>
    );
  }

  if (!scanResult || scanResult.result === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="w-full max-w-sm rounded-2xl border p-8 text-center"
          style={{ backgroundColor: "#1C0A30", borderColor: "rgba(239,68,68,0.4)" }}>
          <div className="text-5xl mb-4">❓</div>
          <h1 className="text-xl font-bold text-white mb-2">Label Not Found</h1>
          <p className="text-sm" style={{ color: "#A9A9B8" }}>
            This QR code does not match any checked-in child.
          </p>
        </div>
      </div>
    );
  }

  // 401 = no session cookie; 403 = session invalid/expired or not authorized
  if (scanResult.result === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="w-full max-w-sm rounded-2xl border p-8 text-center"
          style={{ backgroundColor: "#1C0A30", borderColor: "rgba(239,68,68,0.4)" }}>
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Protected Child Information</h1>
          <p className="text-sm mb-4" style={{ color: "#A9A9B8" }}>
            You must be signed in to your assigned classroom to view this information.
          </p>
          <p className="text-xs" style={{ color: "#555577" }}>
            Scan the QR code in your classroom to sign in.
          </p>
        </div>
      </div>
    );
  }

  if (scanResult.result === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="w-full max-w-sm rounded-2xl border p-8 text-center"
          style={{ backgroundColor: "#1C0A30", borderColor: "rgba(245,158,11,0.4)" }}>
          <div className="text-5xl mb-4">⏱️</div>
          <h1 className="text-xl font-bold text-white mb-2">Label Expired</h1>
          <p className="text-sm" style={{ color: "#A9A9B8" }}>
            {scanResult.expiredReason ?? "This label is no longer valid."}
          </p>
        </div>
      </div>
    );
  }

  const child = scanResult.child!;
  const allAllergyParts = [
    ...(Array.isArray(child.allergies) ? child.allergies : []),
    child.allergyOther,
  ].filter(Boolean);
  const hasCare = allAllergyParts.length > 0 || !!child.medicalNotes || !!child.specialInstructions;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#08060D" }}>
      <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, #1C0A30 0%, ${ACCENT} 100%)` }}>
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.25)" />
            <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="text-white text-xs font-semibold">ShepherdKids</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-0.5">Child Information</h1>
        {child.roomName && <p className="text-orange-100 text-sm">{child.roomName}</p>}
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{child.name}</h2>
              {child.roomName && <p className="text-sm text-gray-500">{child.roomName}</p>}
            </div>
            {child.isNewVisitor && (
              <span className="text-xs px-2 py-1 rounded-full font-bold bg-blue-100 text-blue-700 flex-shrink-0 mt-1">
                ★ NEW VISITOR
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700 mb-4">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Pickup Code</span>
              <span className="font-mono font-black text-2xl text-gray-900">{child.securityCode}</span>
            </div>
            {scanResult.checkedInAt && (
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Checked In</span>
                {fmtTime(scanResult.checkedInAt)}
              </div>
            )}
          </div>

          {child.authorizedPickups && (
            <div className="mb-4 text-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Authorized Pickups</span>
              <span className="text-gray-700">{child.authorizedPickups}</span>
            </div>
          )}

          {hasCare && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              {allAllergyParts.length > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-500 font-bold text-sm flex-shrink-0">⚠️ Allergies:</span>
                  <span className="text-sm text-red-700 font-medium">{allAllergyParts.join(", ")}</span>
                </div>
              )}
              {child.medicalNotes && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-amber-700 font-bold text-sm flex-shrink-0">⚕ Medical:</span>
                  <span className="text-sm text-amber-900">{child.medicalNotes}</span>
                </div>
              )}
              {child.specialInstructions && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <span className="text-blue-700 font-bold text-sm flex-shrink-0">📋 Notes:</span>
                  <span className="text-sm text-blue-900">{child.specialInstructions}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {scanResult.checkinRecordId && scanResult.churchId && (
          requestSent ? (
            <div className="rounded-2xl border px-6 py-4 text-sm font-semibold text-center"
              style={{ backgroundColor: "#DCFCE7", borderColor: "#22C55E", color: "#166534" }}>
              ✓ Parent has been notified.
            </div>
          ) : (
            <button
              onClick={() => handleParentRequest(scanResult.churchId!, scanResult.checkinRecordId!)}
              disabled={requesting}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#991b1b" }}
            >
              {requesting ? "Sending…" : "Request Parent"}
            </button>
          )
        )}
      </div>
    </div>
  );
}
