"use client";

import { useState } from "react";
import RoomAttendanceView from "./RoomAttendanceView";

const ACCENT = "#F28C28";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function RoomPinGate({
  sessionId,
  serviceName,
  date,
  pin,
}: {
  sessionId: string;
  serviceName: string;
  date: string;
  pin: string;
}) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  function handleSubmit() {
    if (entered === pin) {
      setUnlocked(true);
    } else {
      setError(true);
      setEntered("");
    }
  }

  if (unlocked) {
    return <RoomAttendanceView sessionId={sessionId} serviceName={serviceName} date={date} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1A4A2E" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-xl font-bold" style={{ color: "#1A4A2E" }}>
              Shepherd<span style={{ color: ACCENT }}>Well</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Volunteer Access</h1>
          <p className="text-sm font-medium text-gray-700">{serviceName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(date)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
            Enter Volunteer PIN
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={entered}
            onChange={e => {
              setError(false);
              setEntered(e.target.value.replace(/\D/g, "").slice(0, 4));
            }}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="• • • •"
            className="w-full text-center text-3xl font-mono tracking-widest px-4 py-4 border-2 rounded-xl outline-none transition-colors mb-4"
            style={{
              borderColor: error ? "#ef4444" : entered.length === 4 ? ACCENT : "#e5e7eb",
              color: "#1f2937",
            }}
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500 text-center mb-4 font-medium">
              Incorrect PIN. Please try again.
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={entered.length !== 4}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
