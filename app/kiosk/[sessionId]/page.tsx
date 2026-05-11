"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const ACCENT = "#F28C28";

const ALLERGY_OPTIONS = [
  "Peanuts", "Tree Nuts", "Milk/Dairy", "Eggs",
  "Wheat/Gluten", "Soy", "Fish", "Shellfish", "Bee Stings", "Latex",
];

type Step = "phone" | "select" | "new-parent" | "new-children" | "confirm" | "print" | "already-checked-in";

type ReturnChild = {
  childName: string;
  roomId: string | null;
  roomName: string | null;
  allergies: string[];
  allergyOther: string | null;
  parentName: string;
  selected: boolean;
};

type NewChildForm = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  allergyOther: string;
};

type ConfirmedRecord = {
  id: string;
  childName: string;
  roomId: string | null;
  roomName: string | null;
  securityCode: string;
  isNewVisitor: boolean;
  allergies: string[];
  allergyOther: string | null;
};

type SessionInfo = {
  id: string;
  service_name: string;
  date: string;
  kiosk_pin: string;
  status: string;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function emptyChild(): NewChildForm {
  return { firstName: "", lastName: "", dateOfBirth: "", allergies: [], allergyOther: "" };
}

function AllergyToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="px-4 py-3 rounded-2xl text-base font-semibold border-2 transition-colors"
      style={{
        borderColor: checked ? "#dc2626" : "#e5e7eb",
        backgroundColor: checked ? "#fee2e2" : "white",
        color: checked ? "#dc2626" : "#6b7280",
        minHeight: 52,
      }}
    >
      {checked ? "⚠️ " : ""}{label}
    </button>
  );
}

export default function KioskPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("phone");

  // Phone entry
  const [phone, setPhone] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Returning family
  const [returnChildren, setReturnChildren] = useState<ReturnChild[]>([]);

  // New family
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [newChildren, setNewChildren] = useState<NewChildForm[]>([emptyChild()]);

  // Confirm / print
  const [confirmedRecords, setConfirmedRecords] = useState<ConfirmedRecord[]>([]);
  const [checkInParentName, setCheckInParentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  // PIN exit
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  // Load session on mount
  useEffect(() => {
    async function fetchSession() {
      const res = await fetch(`/api/checkin/sessions?id=${sessionId}`);
      if (!res.ok) { setSessionError("Session not found."); return; }
      const d = await res.json();
      if (d.session.status !== "open") { setSessionError("This check-in session is currently closed."); return; }
      setSession(d.session);
    }
    fetchSession();
  }, [sessionId]);

  // Phone lookup
  async function handleLookup() {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length < 7) { setLookupError("Please enter a valid phone number."); return; }
    setLooking(true);
    setLookupError("");
    const res = await fetch("/api/checkin/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, sessionId }),
    });
    const d = await res.json();
    setLooking(false);
    if (d.found && d.children?.length > 0) {
      setReturnChildren(d.children.map((c: Omit<ReturnChild, "selected">) => ({ ...c, selected: true })));
      setStep("select");
    } else {
      setParentPhone(normalized);
      setStep("new-parent");
    }
  }

  // Submit check-in
  async function handleCheckin(isReturning: boolean) {
    if (!session) return;
    setSubmitting(true);

    const children = isReturning
      ? returnChildren.filter(c => c.selected).map(c => ({
          childName: c.childName,
          roomId: c.roomId,
          allergies: c.allergies,
          allergyOther: c.allergyOther ?? null,
        }))
      : newChildren.map(c => ({
          firstName: c.firstName,
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth || null,
          allergies: c.allergies,
          allergyOther: c.allergyOther || null,
        }));

    if (children.length === 0) { setSubmitting(false); return; }

    const pName = isReturning ? (returnChildren.find(c => c.selected)?.parentName ?? "") : parentName;
    const pPhone = isReturning ? phone.replace(/\D/g, "") : parentPhone.replace(/\D/g, "");
    setCheckInParentName(pName);

    console.log('[kiosk] children to check in:', children);
    const res = await fetch("/api/checkin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, parentName: pName, parentPhone: pPhone, parentEmail: isReturning ? undefined : parentEmail || undefined, isReturning, children }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { alert(d.error ?? "Check-in failed"); return; }
    const records = d.records ?? [];
    const dupes = d.duplicates ?? [];
    setConfirmedRecords(records);
    setDuplicates(dupes);
    if (records.length === 0 && dupes.length > 0) {
      setStep("already-checked-in");
    } else {
      setStep("confirm");
    }
  }

  function handlePinExit() {
    if (pinInput === session?.kiosk_pin) {
      router.push("/dashboard/children-ministry/checkin-setup");
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPinInput("");
      pinRef.current?.focus();
    }
  }

  function reset() {
    setStep("phone");
    setPhone("");
    setParentName("");
    setParentPhone("");
    setParentEmail("");
    setNewChildren([emptyChild()]);
    setReturnChildren([]);
    setConfirmedRecords([]);
    setDuplicates([]);
    setCheckInParentName("");
    setLookupError("");
  }

  // Loading / error states
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1a2e1a" }}>
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold mb-2">Check-In Unavailable</h1>
          <p className="text-lg text-gray-300">{sessionError}</p>
          <p className="text-sm text-gray-500 mt-4">Please see a staff member for assistance.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1a2e1a" }}>
        <div className="text-white text-xl animate-pulse">Loading…</div>
      </div>
    );
  }

  const containerStyle = {
    minHeight: "100dvh",
    backgroundColor: "#f9fafb",
    display: "flex",
    flexDirection: "column" as const,
    position: "relative" as const,
  };

  // ── PHONE ENTRY ──
  if (step === "phone") return (
    <div style={containerStyle}>
      <div style={{ backgroundColor: ACCENT, padding: "24px 32px" }}>
        <p className="text-white font-bold text-lg opacity-80">Children's Check-In</p>
        <p className="text-white text-sm opacity-60">{session.service_name} · {fmtDate(session.date)}</p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111827", marginBottom: 8, textAlign: "center" }}>Welcome!</h1>
          <p style={{ fontSize: 20, color: "#6b7280", textAlign: "center", marginBottom: 40 }}>Enter your phone number to check in</p>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => { setPhone(e.target.value); setLookupError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
            placeholder="(555) 000-0000"
            autoFocus
            style={{ width: "100%", fontSize: 32, padding: "20px 24px", borderRadius: 20, border: "3px solid #e5e7eb", textAlign: "center", marginBottom: 12, outline: "none", boxSizing: "border-box" as const }}
          />
          {lookupError && <p style={{ color: "#dc2626", textAlign: "center", marginBottom: 12, fontSize: 16 }}>{lookupError}</p>}
          <button
            onClick={handleLookup}
            disabled={looking || phone.replace(/\D/g, "").length < 7}
            style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 24, fontWeight: 800, cursor: looking ? "default" : "pointer", opacity: looking ? 0.7 : 1 }}
          >
            {looking ? "Looking up…" : "Get Started →"}
          </button>
        </div>
      </div>
      <PinExitButton onTap={() => { setShowPin(true); setPinInput(""); setPinError(""); }} />
      {showPin && <PinModal pin={pinInput} error={pinError} inputRef={pinRef} onChange={p => { setPinInput(p); setPinError(""); }} onConfirm={handlePinExit} onCancel={() => setShowPin(false)} />}
    </div>
  );

  // ── SELECT (returning family) ──
  if (step === "select") {
    const anySelected = returnChildren.some(c => c.selected);
    return (
      <div style={containerStyle}>
        <div style={{ backgroundColor: ACCENT, padding: "24px 32px" }}>
          <p className="text-white font-bold text-lg">Welcome Back!</p>
          <p className="text-white text-sm opacity-75">Who is checking in today?</p>
        </div>
        <div style={{ flex: 1, padding: "40px 32px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: 32 }}>
            {returnChildren.map((child, i) => (
              <button
                key={i}
                onClick={() => setReturnChildren(cs => cs.map((c, j) => j === i ? { ...c, selected: !c.selected } : c))}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", borderRadius: 20, border: `3px solid ${child.selected ? ACCENT : "#e5e7eb"}`, backgroundColor: child.selected ? ACCENT + "11" : "white", marginBottom: 12, cursor: "pointer", textAlign: "left" as const }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: child.selected ? ACCENT : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {child.selected ? <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>✓</span> : null}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{child.childName}</div>
                  {child.roomName && <div style={{ fontSize: 15, color: "#6b7280" }}>Room: {child.roomName}</div>}
                  {child.allergies.length > 0 && <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>⚠️ {child.allergies.join(", ")}{child.allergyOther ? `, ${child.allergyOther}` : ""}</div>}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => handleCheckin(true)}
            disabled={!anySelected || submitting}
            style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: anySelected ? ACCENT : "#e5e7eb", color: anySelected ? "white" : "#9ca3af", fontSize: 22, fontWeight: 800, cursor: anySelected && !submitting ? "pointer" : "default", marginBottom: 16 }}
          >
            {submitting ? "Checking in…" : "Check In →"}
          </button>
          <button onClick={() => { setStep("phone"); setPhone(""); setReturnChildren([]); }} style={{ width: "100%", padding: "16px", borderRadius: 20, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
            ← Different Family / New Family
          </button>
        </div>
        <PinExitButton onTap={() => { setShowPin(true); setPinInput(""); setPinError(""); }} />
        {showPin && <PinModal pin={pinInput} error={pinError} inputRef={pinRef} onChange={p => { setPinInput(p); setPinError(""); }} onConfirm={handlePinExit} onCancel={() => setShowPin(false)} />}
      </div>
    );
  }

  // ── NEW PARENT INFO ──
  if (step === "new-parent") return (
    <div style={containerStyle}>
      <div style={{ backgroundColor: ACCENT, padding: "24px 32px" }}>
        <p className="text-white font-bold text-lg">New Family Registration</p>
        <p className="text-white text-sm opacity-75">Step 1 of 2 — Your information</p>
      </div>
      <div style={{ flex: 1, padding: "40px 32px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 32 }}>Parent / Guardian Info</h2>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Full Name *</label>
          <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", fontSize: 22, padding: "18px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Phone Number *</label>
          <input type="tel" inputMode="numeric" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="555-000-0000" style={{ width: "100%", fontSize: 22, padding: "18px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Email (optional)</label>
          <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="jane@example.com" style={{ width: "100%", fontSize: 22, padding: "18px 20px", borderRadius: 16, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
        </div>
        <button
          onClick={() => setStep("new-children")}
          disabled={!parentName.trim() || parentPhone.replace(/\D/g, "").length < 7}
          style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: parentName.trim() && parentPhone.replace(/\D/g, "").length >= 7 ? ACCENT : "#e5e7eb", color: parentName.trim() && parentPhone.replace(/\D/g, "").length >= 7 ? "white" : "#9ca3af", fontSize: 22, fontWeight: 800, cursor: "pointer", marginTop: 16 }}
        >
          Next: Add Children →
        </button>
        <button onClick={() => setStep("phone")} style={{ width: "100%", padding: "16px", marginTop: 12, borderRadius: 20, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
          ← Back
        </button>
      </div>
      <PinExitButton onTap={() => { setShowPin(true); setPinInput(""); setPinError(""); }} />
      {showPin && <PinModal pin={pinInput} error={pinError} inputRef={pinRef} onChange={p => { setPinInput(p); setPinError(""); }} onConfirm={handlePinExit} onCancel={() => setShowPin(false)} />}
    </div>
  );

  // ── NEW CHILDREN FORM ──
  if (step === "new-children") return (
    <div style={containerStyle}>
      <div style={{ backgroundColor: ACCENT, padding: "24px 32px" }}>
        <p className="text-white font-bold text-lg">New Family Registration</p>
        <p className="text-white text-sm opacity-75">Step 2 of 2 — Add children</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", maxWidth: 700, margin: "0 auto", width: "100%", boxSizing: "border-box" as const }}>
        {newChildren.map((child, i) => (
          <div key={i} style={{ backgroundColor: "white", borderRadius: 20, padding: "24px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "2px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Child {i + 1}</h3>
              {newChildren.length > 1 && (
                <button onClick={() => setNewChildren(cs => cs.filter((_, j) => j !== i))} style={{ color: "#dc2626", fontWeight: 700, background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>Remove</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>First Name *</label>
                <input value={child.firstName} onChange={e => setNewChildren(cs => cs.map((c, j) => j === i ? { ...c, firstName: e.target.value } : c))} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Last Name *</label>
                <input value={child.lastName} onChange={e => setNewChildren(cs => cs.map((c, j) => j === i ? { ...c, lastName: e.target.value } : c))} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Date of Birth</label>
              <input type="date" value={child.dateOfBirth} min="2000-01-01" max={new Date().toISOString().slice(0, 10)} onChange={e => setNewChildren(cs => cs.map((c, j) => j === i ? { ...c, dateOfBirth: e.target.value } : c))} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Allergies</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {ALLERGY_OPTIONS.map(a => (
                  <AllergyToggle key={a} label={a} checked={child.allergies.includes(a)} onChange={() => setNewChildren(cs => cs.map((c, j) => j !== i ? c : { ...c, allergies: c.allergies.includes(a) ? c.allergies.filter(x => x !== a) : [...c.allergies, a] }))} />
                ))}
              </div>
              <input value={child.allergyOther} onChange={e => setNewChildren(cs => cs.map((c, j) => j === i ? { ...c, allergyOther: e.target.value } : c))} placeholder="Other (describe)…" style={{ width: "100%", fontSize: 18, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
            </div>
          </div>
        ))}

        {newChildren.length < 6 && (
          <button onClick={() => setNewChildren(cs => [...cs, emptyChild()])} style={{ width: "100%", padding: "18px", borderRadius: 20, border: "2px dashed #e5e7eb", backgroundColor: "white", color: ACCENT, fontSize: 18, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>
            + Add Another Child
          </button>
        )}

        <button
          onClick={() => handleCheckin(false)}
          disabled={submitting || newChildren.some(c => !c.firstName.trim() || !c.lastName.trim())}
          style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 22, fontWeight: 800, cursor: "pointer", marginBottom: 12, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Checking in…" : "Check In →"}
        </button>
        <button onClick={() => setStep("new-parent")} style={{ width: "100%", padding: "16px", borderRadius: 20, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
          ← Back
        </button>
      </div>
      <PinExitButton onTap={() => { setShowPin(true); setPinInput(""); setPinError(""); }} />
      {showPin && <PinModal pin={pinInput} error={pinError} inputRef={pinRef} onChange={p => { setPinInput(p); setPinError(""); }} onConfirm={handlePinExit} onCancel={() => setShowPin(false)} />}
    </div>
  );

  // ── ALREADY CHECKED IN ──
  if (step === "already-checked-in") return (
    <div style={containerStyle}>
      <div style={{ backgroundColor: "#16a34a", padding: "24px 32px" }}>
        <p className="text-white font-bold text-lg">Children's Check-In</p>
        <p className="text-white text-sm opacity-75">{session.service_name} · {fmtDate(session.date)}</p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 24 }}>✅</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 12 }}>Your family is already checked in today!</h1>
          <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 32 }}>These children were already checked in for this service:</p>
          <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #22c55e", borderRadius: 20, padding: "20px 24px", marginBottom: 40 }}>
            {duplicates.map((name, i) => (
              <div key={i} style={{ fontSize: 24, fontWeight: 700, color: "#111827", padding: "8px 0", borderBottom: i < duplicates.length - 1 ? "1px solid #dcfce7" : "none" }}>
                {name}
              </div>
            ))}
          </div>
          <button onClick={reset} style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: "#16a34a", color: "white", fontSize: 24, fontWeight: 800, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
      <PinExitButton onTap={() => { setShowPin(true); setPinInput(""); setPinError(""); }} />
      {showPin && <PinModal pin={pinInput} error={pinError} inputRef={pinRef} onChange={p => { setPinInput(p); setPinError(""); }} onConfirm={handlePinExit} onCancel={() => setShowPin(false)} />}
    </div>
  );

  // ── CONFIRM ──
  if (step === "confirm") {
    const code = confirmedRecords[0]?.securityCode ?? "—";
    return (
      <div style={containerStyle}>
        <div style={{ backgroundColor: "#16a34a", padding: "24px 32px" }}>
          <p className="text-white font-bold text-lg">✅ All Set!</p>
          <p className="text-white text-sm opacity-75">Check-in complete</p>
        </div>
        <div style={{ flex: 1, padding: "40px 32px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
          {duplicates.length > 0 && (
            <div style={{ backgroundColor: "#fefce8", border: "2px solid #facc15", borderRadius: 16, padding: "14px 20px", marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#92400e", margin: 0 }}>
                Already checked in today: {duplicates.join(", ")}
              </p>
            </div>
          )}

          <div style={{ backgroundColor: "#f0fdf4", border: "3px solid #22c55e", borderRadius: 20, padding: "24px", textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#16a34a", marginBottom: 4 }}>Family Security Code</p>
            <p style={{ fontSize: 56, fontWeight: 900, color: "#111827", letterSpacing: "0.15em", fontFamily: "monospace" }}>{code}</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Show this code at pickup</p>
          </div>

          {confirmedRecords.map((r, i) => (
            <div key={i} style={{ backgroundColor: "white", borderRadius: 20, padding: "20px 24px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "2px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: r.allergies.length > 0 ? 10 : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{r.childName}</div>
                  <div style={{ fontSize: 16, color: "#6b7280" }}>{r.roomName ?? "Room TBD"}</div>
                </div>
                {r.isNewVisitor && <span style={{ backgroundColor: ACCENT, color: "white", fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 20 }}>🆕 NEW VISITOR</span>}
              </div>
              {(r.allergies.length > 0 || r.allergyOther) && (
                <div style={{ backgroundColor: "#fee2e2", borderRadius: 12, padding: "10px 14px", marginTop: 8 }}>
                  <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 14 }}>⚠️ ALLERGY: {[...r.allergies, r.allergyOther].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setStep("print")} style={{ width: "100%", padding: "22px", borderRadius: 20, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 22, fontWeight: 800, cursor: "pointer", marginTop: 8, marginBottom: 12 }}>
            🖨️ Print Labels →
          </button>
          <button onClick={reset} style={{ width: "100%", padding: "16px", borderRadius: 20, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
            Done (Start Over)
          </button>
        </div>
      </div>
    );
  }

  // ── PRINT ──
  if (step === "print") return (
    <div style={containerStyle}>
      <div className="no-print" style={{ backgroundColor: ACCENT, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="text-white font-bold text-lg">🖨️ Print Check-In Labels</p>
        <button onClick={() => window.print()} style={{ backgroundColor: "white", color: ACCENT, fontWeight: 800, fontSize: 18, padding: "12px 28px", borderRadius: 14, border: "none", cursor: "pointer" }}>
          Print
        </button>
      </div>

      {/* Labels for screen preview */}
      <div className="no-print" style={{ flex: 1, padding: "32px", backgroundColor: "#f3f4f6" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {confirmedRecords.map((r, i) => <LabelCard key={i} record={r} />)}
          <ParentReceipt parentName={checkInParentName} serviceName={session.service_name} serviceDate={session.date} records={confirmedRecords} />
        </div>
      </div>

      {/* Print-only layout */}
      <div className="print-only" style={{ display: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, padding: 8 }}>
          {confirmedRecords.map((r, i) => <LabelCard key={i} record={r} forPrint />)}
          <ParentReceipt parentName={checkInParentName} serviceName={session.service_name} serviceDate={session.date} records={confirmedRecords} forPrint />
        </div>
      </div>

      <div className="no-print" style={{ padding: "20px 32px", borderTop: "1px solid #e5e7eb", backgroundColor: "white" }}>
        <button onClick={reset} style={{ width: "100%", padding: "18px", borderRadius: 20, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
          Done (Start Over)
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { margin: 0; padding: 0; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </div>
  );

  return null;
}

function LabelCard({ record, forPrint }: { record: ConfirmedRecord; forPrint?: boolean }) {
  const hasAllergy = record.allergies.length > 0 || record.allergyOther;
  const allergyText = [...record.allergies, record.allergyOther].filter(Boolean).join(", ");

  return (
    <div style={{
      backgroundColor: "white",
      border: "2px solid #111827",
      borderRadius: forPrint ? 8 : 16,
      padding: forPrint ? "12px 16px" : "20px 24px",
      pageBreakInside: "avoid",
      breakInside: "avoid",
    }}>
      {record.isNewVisitor && (
        <div style={{ backgroundColor: ACCENT, color: "white", fontWeight: 800, fontSize: forPrint ? 11 : 13, padding: "4px 10px", borderRadius: 20, display: "inline-block", marginBottom: 8 }}>
          🆕 NEW VISITOR
        </div>
      )}
      <div style={{ fontSize: forPrint ? 24 : 28, fontWeight: 900, color: "#111827", lineHeight: 1.1, marginBottom: 6 }}>{record.childName}</div>
      <div style={{ fontSize: forPrint ? 14 : 16, color: "#374151", marginBottom: 4 }}>Room: {record.roomName ?? "TBD"}</div>
      <div style={{ fontSize: forPrint ? 22 : 28, fontWeight: 900, color: "#111827", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: hasAllergy ? 10 : 0 }}>
        {record.securityCode}
      </div>
      {hasAllergy && (
        <div style={{ backgroundColor: "#dc2626", color: "white", fontWeight: 800, fontSize: forPrint ? 12 : 14, padding: "6px 12px", borderRadius: 8, marginTop: 4 }}>
          ⚠️ ALLERGY ALERT: {allergyText}
        </div>
      )}
    </div>
  );
}

function ParentReceipt({ parentName, serviceName, serviceDate, records, forPrint }: {
  parentName: string;
  serviceName: string;
  serviceDate: string;
  records: ConfirmedRecord[];
  forPrint?: boolean;
}) {
  const code = records[0]?.securityCode ?? "—";
  const dateStr = new Date(serviceDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return (
    <div style={{
      backgroundColor: "white",
      border: "2px solid #111827",
      borderRadius: forPrint ? 8 : 16,
      padding: forPrint ? "12px 16px" : "24px",
      pageBreakInside: "avoid",
      breakInside: "avoid",
    }}>
      <div style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: forPrint ? 6 : 10, marginBottom: forPrint ? 6 : 12 }}>
        <div style={{ fontSize: forPrint ? 24 : 20, fontWeight: 900, color: "#111827" }}>📋 Pickup Receipt</div>
        <div style={{ fontSize: forPrint ? 11 : 13, color: "#6b7280", marginTop: 2 }}>{serviceName} · {dateStr}</div>
      </div>
      <div style={{ marginBottom: forPrint ? 4 : 10 }}>
        <div style={{ fontSize: forPrint ? 10 : 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Parent / Guardian</div>
        <div style={{ fontSize: forPrint ? 14 : 18, fontWeight: 700, color: "#111827" }}>{parentName || "—"}</div>
      </div>
      <div style={{ marginBottom: forPrint ? 4 : 14 }}>
        <div style={{ fontSize: forPrint ? 10 : 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: forPrint ? 2 : 4 }}>Children</div>
        {records.map((r, i) => (
          <div key={i} style={{ fontSize: forPrint ? 12 : 15, color: "#374151", paddingLeft: 8, marginBottom: 2 }}>
            • {r.childName} — {r.roomName ?? "Room TBD"}
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #22c55e", borderRadius: forPrint ? 8 : 10, padding: forPrint ? "6px 12px" : "10px 14px", textAlign: "center", marginBottom: forPrint ? 4 : 12 }}>
        <div style={{ fontSize: forPrint ? 10 : 12, fontWeight: 600, color: "#16a34a", marginBottom: 2 }}>Security Code</div>
        <div style={{ fontSize: forPrint ? 22 : 44, fontWeight: 900, color: "#111827", letterSpacing: "0.18em", fontFamily: "monospace", lineHeight: 1 }}>{code}</div>
      </div>
      <div style={{ fontSize: forPrint ? 9 : 12, color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
        Present this security code at pickup. A photo ID may be required for non-parent pickups.
      </div>
    </div>
  );
}

function PinExitButton({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      style={{ position: "fixed", bottom: 20, right: 20, width: 44, height: 44, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 100 }}
      title="Staff exit"
    >
      🔒
    </button>
  );
}

function PinModal({ pin, error, inputRef, onChange, onConfirm, onCancel }: {
  pin: string; error: string; inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ backgroundColor: "white", borderRadius: 24, padding: 40, width: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 8, textAlign: "center" }}>Staff Exit</h2>
        <p style={{ fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>Enter kiosk PIN to exit</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={e => e.key === "Enter" && onConfirm()}
          style={{ width: "100%", fontSize: 36, textAlign: "center", padding: "16px", borderRadius: 16, border: "2px solid #e5e7eb", letterSpacing: "0.3em", boxSizing: "border-box" as const }}
        />
        {error && <p style={{ color: "#dc2626", textAlign: "center", marginTop: 8, fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Exit</button>
        </div>
      </div>
    </div>
  );
}
