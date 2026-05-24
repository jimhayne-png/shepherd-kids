"use client";

import { useState } from "react";

const ACCENT = "#F28C28";

type Room = { id: string; name: string };

type Props = {
  sessionToken: string;
  serviceName: string;
  serviceDate: string;
  rooms: Room[];
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function KioskCheckInForm({ sessionToken, serviceName, serviceDate, rooms }: Props) {
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [roomId, setRoomId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [securityCode, setSecurityCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentName.trim() || !parentPhone.trim() || !childName.trim()) return;
    setSubmitting(true);
    setFormError("");

    const res = await fetch(`/api/kiosk/${sessionToken}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName: parentName.trim(),
        parentPhone,
        childName: childName.trim(),
        childAge: childAge ? Number(childAge) : undefined,
        roomId: roomId || undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error ?? "Check-in failed. Please try again.");
      return;
    }

    setSecurityCode(data.securityCode);
  }

  function reset() {
    setParentName("");
    setParentPhone("");
    setChildName("");
    setChildAge("");
    setRoomId("");
    setFormError("");
    setSecurityCode(null);
  }

  if (securityCode) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" }}>
        <div style={{ backgroundColor: "#16a34a", padding: "24px 32px" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>✅ Check-In Complete!</p>
          <p style={{ color: "white", opacity: 0.75, fontSize: 14, margin: "4px 0 0" }}>
            {serviceName} · {fmtDate(serviceDate)}
          </p>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
          <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
            <p style={{ fontSize: 18, color: "#374151", marginBottom: 8 }}>Your family security code is:</p>
            <div style={{ backgroundColor: "#f0fdf4", border: "3px solid #22c55e", borderRadius: 20, padding: "32px 24px", marginBottom: 32 }}>
              <p style={{ fontSize: 72, fontWeight: 900, color: "#111827", letterSpacing: "0.15em", fontFamily: "monospace", margin: 0, lineHeight: 1 }}>
                {securityCode}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12, marginBottom: 0 }}>
                Show this code at pickup
              </p>
            </div>
            <button
              onClick={reset}
              style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 20, fontWeight: 800, cursor: "pointer" }}
            >
              Done (Start Over)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const phoneDigits = parentPhone.replace(/\D/g, "");
  const canSubmit = !!(parentName.trim() && phoneDigits.length >= 7 && childName.trim());

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" }}>
      <div style={{ backgroundColor: ACCENT, padding: "24px 32px" }}>
        <p style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>Children's Check-In</p>
        <p style={{ color: "white", opacity: 0.75, fontSize: 14, margin: "4px 0 0" }}>
          {serviceName} · {fmtDate(serviceDate)}
        </p>
      </div>

      <div style={{ flex: 1, padding: "40px 32px", maxWidth: 600, margin: "0 auto", width: "100%", boxSizing: "border-box" as const }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Welcome!</h1>
        <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 36 }}>Please fill in your information to check in.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
              Parent / Guardian Name *
            </label>
            <input
              type="text"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="Jane Smith"
              required
              style={{ width: "100%", fontSize: 22, padding: "16px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
              Parent Phone *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              placeholder="(555) 000-0000"
              required
              style={{ width: "100%", fontSize: 22, padding: "16px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
              Child&apos;s Full Name *
            </label>
            <input
              type="text"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              placeholder="First Last"
              required
              style={{ width: "100%", fontSize: 22, padding: "16px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
              Child&apos;s Age
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={18}
              value={childAge}
              onChange={e => setChildAge(e.target.value)}
              placeholder="Age"
              style={{ width: "100%", fontSize: 22, padding: "16px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, outline: "none" }}
            />
          </div>

          {rooms.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                Room
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                style={{ width: "100%", fontSize: 20, padding: "16px 20px", borderRadius: 16, border: "2px solid #e5e7eb", backgroundColor: "white", boxSizing: "border-box" as const, outline: "none" }}
              >
                <option value="">Select a room…</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {formError && (
            <p style={{ color: "#dc2626", fontSize: 16, marginBottom: 16, textAlign: "center" }}>
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            style={{
              width: "100%",
              padding: "22px",
              borderRadius: 20,
              border: "none",
              backgroundColor: canSubmit && !submitting ? ACCENT : "#e5e7eb",
              color: canSubmit && !submitting ? "white" : "#9ca3af",
              fontSize: 22,
              fontWeight: 800,
              cursor: canSubmit && !submitting ? "pointer" : "default",
              marginTop: 8,
            }}
          >
            {submitting ? "Checking in…" : "Check In →"}
          </button>
        </form>
      </div>
    </div>
  );
}
