"use client";

import { useState } from "react";

const ACCENT = "#F28C28";

// Smart Label sign-in for personal phones.
// Authenticates a volunteer via phone number + Personal Volunteer PIN, which causes
// the server to set an HttpOnly vk_session cookie on this device. The volunteer can
// then scan children's Smart Label QR codes at /kiosk/scan/[token] to view
// protected child care information on their personal phone.

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="#1C0A30" />
        <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-lg font-bold" style={{ color: "#1C0A30" }}>
        Shepherd<span style={{ color: ACCENT }}>Kids</span>
      </span>
    </div>
  );
}

type SignedInState = { volunteerName: string; roomName: string; expiresAt: string };

export default function ClassroomSignIn({
  churchId,
  roomQrToken,
  roomName,
  churchName,
}: {
  churchId: string;
  roomQrToken: string;
  roomName: string;
  churchName: string;
}) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState<SignedInState | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || pin.length !== 4 || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/kiosk/volunteer/${churchId}/verify-volunteer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: phone.trim(), pin, roomToken: roomQrToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Sign-in failed. Check your phone number and PIN.");
        setLoading(false);
        return;
      }

      // The server sets an HttpOnly vk_session cookie automatically.
      // No client-side storage is used.
      setSignedIn({
        volunteerName: data.volunteerName,
        roomName: data.roomName,
        expiresAt: data.expiresAt,
      });
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  if (signedIn) {
    const expiresTime = new Date(signedIn.expiresAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="w-full max-w-sm text-center">
          <div className="mb-6"><Logo /></div>
          <div className="rounded-2xl border p-8" style={{ backgroundColor: "#1C0A30", borderColor: "rgba(34,197,94,0.5)" }}>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-white mb-1">Welcome, {signedIn.volunteerName}!</h1>
            <p className="text-sm mb-4" style={{ color: "#A9A9B8" }}>
              Signed in to <strong className="text-white">{signedIn.roomName}</strong>
            </p>
            <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
              Session active until {expiresTime}
            </div>
            <p className="text-xs" style={{ color: "#A9A9B8" }}>
              You can now scan child labels from this device to view care information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-3"><Logo /></div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#D4AF37" }}>
            Smart Label Access
          </p>
          <h1 className="text-2xl font-bold text-white mb-1">Volunteer Sign-In</h1>
          <p className="text-sm" style={{ color: "#A9A9B8" }}>
            {roomName} &middot; {churchName}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-8 space-y-5"
          style={{ backgroundColor: "#1C0A30", borderColor: "rgba(123,44,191,0.4)" }}
        >
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#D8D8E8" }}>
              Phone Number
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              required
              className="w-full px-4 py-3 text-sm border-2 rounded-xl outline-none transition-colors"
              style={{ borderColor: "#4B3080", color: "#ffffff", backgroundColor: "#12051f", WebkitTextFillColor: "#ffffff" }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#D8D8E8" }}>
              Personal Volunteer PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="• • • •"
              required
              className="w-full text-center text-3xl font-mono tracking-widest px-4 py-4 border-2 rounded-xl outline-none transition-colors"
              style={{
                borderColor: pin.length === 4 ? ACCENT : "#4B3080",
                color: "#ffffff",
                backgroundColor: "#12051f",
                WebkitTextFillColor: "#ffffff",
                caretColor: "#ffffff",
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400 text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!phone.trim() || pin.length !== 4 || loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#555577" }}>
          Your PIN is set by your children&apos;s ministry administrator.
        </p>
      </div>
    </div>
  );
}
