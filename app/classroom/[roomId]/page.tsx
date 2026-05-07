"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const ACCENT = "#F28C28";

type CheckinRecord = {
  id: string;
  child_name: string;
  parent_name: string;
  parent_phone: string;
  security_code: string;
  is_new_visitor: boolean;
  allergies: string[];
  allergy_other: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_out_by: string | null;
};

type RoomInfo = { id: string; name: string };
type SessionInfo = { id: string; service_name: string; date: string } | null;
type Counts = { checkedIn: number; checkedOut: number };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ClassroomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [session, setSession] = useState<SessionInfo>(null);
  const [counts, setCounts] = useState<Counts>({ checkedIn: 0, checkedOut: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout modal
  const [checkoutRecord, setCheckoutRecord] = useState<CheckinRecord | null>(null);
  const [checkoutInput, setCheckoutInput] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const checkoutInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/checkin/classroom/${roomId}`);
    if (!res.ok) { setError("Could not load classroom data."); return; }
    const d = await res.json();
    setRecords(d.records ?? []);
    setRoom(d.room ?? null);
    setSession(d.session ?? null);
    setCounts(d.counts ?? { checkedIn: 0, checkedOut: 0 });
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (checkoutRecord) {
      setTimeout(() => checkoutInputRef.current?.focus(), 80);
    }
  }, [checkoutRecord]);

  function verifyCheckout(record: CheckinRecord, input: string): boolean {
    const normalized = input.replace(/\D/g, "");
    return input.trim() === record.security_code ||
      normalized === record.parent_phone ||
      (normalized.length >= 4 && record.parent_phone.endsWith(normalized));
  }

  async function handleCheckout() {
    if (!checkoutRecord) return;
    if (!verifyCheckout(checkoutRecord, checkoutInput)) {
      setCheckoutError("Incorrect phone number or security code. Please try again.");
      setCheckoutInput("");
      checkoutInputRef.current?.focus();
      return;
    }
    setCheckingOut(true);
    const res = await fetch("/api/checkin/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: checkoutRecord.id, checkedOutBy: "staff" }),
    });
    setCheckingOut(false);
    if (res.ok) {
      setCheckoutRecord(null);
      setCheckoutInput("");
      setCheckoutError("");
      await fetchData();
    } else {
      const d = await res.json();
      setCheckoutError(d.error ?? "Checkout failed.");
    }
  }

  const checkedInRecords = records.filter((r: CheckinRecord) => !r.checked_out_at);
  const checkedOutRecords = records.filter((r: CheckinRecord) => r.checked_out_at);

  if (loading) return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "white", fontSize: 24, fontWeight: 600 }}>Loading…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "white", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontSize: 20 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#f3f4f6", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#1a2e1a", padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: 0, fontFamily: "Georgia, serif" }}>{room?.name ?? "Classroom"}</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, margin: "4px 0 0" }}>{session ? `${session.service_name} · ${new Date(session.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : "No active session"}</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#4ade80" }}>{counts.checkedIn}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>IN</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "rgba(255,255,255,0.4)" }}>{counts.checkedOut}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>OUT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Children list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px" }}>
        {!session && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🕐</div>
            <p style={{ fontSize: 20, color: "#6b7280", fontWeight: 600 }}>No open session</p>
            <p style={{ fontSize: 15, color: "#9ca3af" }}>Check-in sessions will appear automatically when opened</p>
          </div>
        )}

        {/* Checked in */}
        {checkedInRecords.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Checked In ({checkedInRecords.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {checkedInRecords.map(r => (
                <ChildCard key={r.id} record={r} onCheckout={() => { setCheckoutRecord(r); setCheckoutInput(""); setCheckoutError(""); }} />
              ))}
            </div>
          </div>
        )}

        {/* Checked out */}
        {checkedOutRecords.length > 0 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Checked Out ({checkedOutRecords.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {checkedOutRecords.map(r => (
                <ChildCard key={r.id} record={r} checkedOut />
              ))}
            </div>
          </div>
        )}

        {session && records.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <p style={{ fontSize: 20, color: "#6b7280", fontWeight: 600 }}>No children checked in yet</p>
            <p style={{ fontSize: 15, color: "#9ca3af" }}>Children will appear here as they check in</p>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      {checkoutRecord && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ backgroundColor: "white", borderRadius: 24, padding: 36, width: "100%", maxWidth: 440, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Check Out</h2>
            <p style={{ fontSize: 18, color: ACCENT, fontWeight: 700, marginBottom: 20 }}>{checkoutRecord.child_name}</p>
            <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 16 }}>Enter parent's phone number or family security code:</p>
            <input
              ref={checkoutInputRef}
              type="text"
              inputMode="numeric"
              value={checkoutInput}
              onChange={e => { setCheckoutInput(e.target.value); setCheckoutError(""); }}
              onKeyDown={e => e.key === "Enter" && handleCheckout()}
              placeholder="Phone or code"
              style={{ width: "100%", fontSize: 28, textAlign: "center", padding: "18px 16px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, marginBottom: 8 }}
            />
            {checkoutError && <p style={{ color: "#dc2626", fontSize: 14, textAlign: "center", marginBottom: 8 }}>{checkoutError}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={() => { setCheckoutRecord(null); setCheckoutInput(""); setCheckoutError(""); }} style={{ flex: 1, padding: "16px", borderRadius: 14, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleCheckout} disabled={!checkoutInput.trim() || checkingOut} style={{ flex: 2, padding: "16px", borderRadius: 14, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", opacity: checkingOut ? 0.7 : 1 }}>
                {checkingOut ? "Checking out…" : "Confirm Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChildCard({ record, onCheckout, checkedOut }: { record: CheckinRecord; onCheckout?: () => void; checkedOut?: boolean }) {
  const hasAllergy = record.allergies.length > 0 || record.allergy_other;
  const allergyText = [...(record.allergies ?? []), record.allergy_other].filter(Boolean).join(", ");

  return (
    <div style={{
      backgroundColor: checkedOut ? "#f9fafb" : "white",
      borderRadius: 20,
      padding: "20px",
      boxShadow: checkedOut ? "none" : "0 2px 12px rgba(0,0,0,0.07)",
      border: `2px solid ${checkedOut ? "#e5e7eb" : "#f3f4f6"}`,
      opacity: checkedOut ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>{record.child_name}</span>
            {record.is_new_visitor && !checkedOut && (
              <span style={{ backgroundColor: ACCENT, color: "white", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 16 }}>🆕 NEW</span>
            )}
            {checkedOut && (
              <span style={{ backgroundColor: "#d1fae5", color: "#059669", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 16 }}>✅ OUT</span>
            )}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#374151", fontFamily: "monospace", letterSpacing: "0.12em" }}>{record.security_code}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            In: {fmtTime(record.checked_in_at)}{record.checked_out_at ? ` · Out: ${fmtTime(record.checked_out_at)}` : ""}
          </div>
        </div>
        {!checkedOut && onCheckout && (
          <button
            onClick={onCheckout}
            style={{ backgroundColor: "#1a2e1a", color: "white", fontWeight: 700, fontSize: 14, padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            Check Out →
          </button>
        )}
      </div>
      {hasAllergy && (
        <div style={{ backgroundColor: "#dc2626", color: "white", fontWeight: 800, fontSize: 13, padding: "8px 12px", borderRadius: 10, marginTop: 8 }}>
          ⚠️ ALLERGY: {allergyText}
        </div>
      )}
    </div>
  );
}
