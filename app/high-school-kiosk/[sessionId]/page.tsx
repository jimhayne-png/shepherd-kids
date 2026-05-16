"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ACCENT = "#F28C28";
const GRADES = ["9th", "10th", "11th", "12th"];

type Step = "phone" | "new-form" | "confirm";
type SessionInfo = { id: string; name: string; date: string; status: string };

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f9fafb",
  display: "flex",
  flexDirection: "column",
};

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function HSKioskPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("phone");

  const [phone, setPhone] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [studentName, setStudentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // New student form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");

  useEffect(() => {
    fetch(`/api/high-school-ministry/checkin-sessions?id=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.session || d.session.status !== "open") {
          setSessionError(d.session ? "This session is closed." : "Session not found.");
        } else {
          setSession(d.session);
        }
      })
      .catch(() => setSessionError("Could not load session."));
  }, [sessionId]);

  async function handlePhoneLookup() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) { setLookupError("Please enter a valid phone number."); return; }
    setLooking(true);
    setLookupError("");
    const res = await fetch("/api/high-school-ministry/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, phone }),
    });
    const data = await res.json();
    setLooking(false);
    if (data.success) {
      setStudentName(data.studentName);
      setStep("confirm");
    } else if (data.found === false) {
      setStep("new-form");
    } else {
      setLookupError(data.error ?? "Something went wrong.");
    }
  }

  async function handleNewStudentSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch("/api/high-school-ministry/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, phone, firstName: firstName.trim(), lastName: lastName.trim(), grade, dateOfBirth: dob, address, city, state: stateVal, zip }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      setStudentName(data.studentName);
      setStep("confirm");
    } else {
      setSubmitError(data.error ?? "Check-in failed. Please try again or see a staff member.");
    }
  }

  function resetKiosk() {
    setStep("phone");
    setPhone("");
    setLookupError("");
    setFirstName(""); setLastName(""); setGrade(""); setDob("");
    setAddress(""); setCity(""); setStateVal(""); setZip("");
    setStudentName("");
  }

  useEffect(() => {
    if (step === "confirm") {
      const t = setTimeout(resetKiosk, 5000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (sessionError) return (
    <div style={containerStyle}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{sessionError}</p>
          <p style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>Please see a staff member for assistance.</p>
        </div>
      </div>
    </div>
  );

  if (!session) return (
    <div style={containerStyle}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#9ca3af", fontSize: 18 }}>Loading…</p>
      </div>
    </div>
  );

  const headerStyle: React.CSSProperties = {
    backgroundColor: ACCENT,
    padding: "24px 32px",
    textAlign: "center",
  };

  // STEP: phone
  if (step === "phone") return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <p style={{ margin: 0, fontSize: 13, color: "white", opacity: 0.85, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
          {session.name}
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, color: "white" }}>Senior High Check-In</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "white", opacity: 0.8 }}>{fmt(session.date)}</p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 8, textAlign: "center" }}>Enter Your Phone Number</h2>
          <p style={{ fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 32 }}>We&apos;ll look you up or get you registered.</p>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => { setPhone(formatPhone(e.target.value)); setLookupError(""); }}
            placeholder="555-000-0000"
            style={{ width: "100%", fontSize: 28, padding: "20px 24px", borderRadius: 20, border: lookupError ? "2px solid #ef4444" : "2px solid #e5e7eb", boxSizing: "border-box", textAlign: "center", letterSpacing: 3 }}
            onKeyDown={e => { if (e.key === "Enter") handlePhoneLookup(); }}
          />
          {lookupError && <p style={{ marginTop: 10, color: "#ef4444", fontSize: 15, textAlign: "center" }}>{lookupError}</p>}
          <button
            onClick={handlePhoneLookup}
            disabled={looking || phone.replace(/\D/g, "").length < 7}
            style={{ width: "100%", marginTop: 20, padding: "22px", borderRadius: 20, border: "none", backgroundColor: phone.replace(/\D/g, "").length >= 7 ? ACCENT : "#e5e7eb", color: phone.replace(/\D/g, "").length >= 7 ? "white" : "#9ca3af", fontSize: 22, fontWeight: 800, cursor: phone.replace(/\D/g, "").length >= 7 ? "pointer" : "default" }}
          >
            {looking ? "Looking up…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );

  // STEP: new-form
  if (step === "new-form") return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <p style={{ margin: 0, fontSize: 13, color: "white", opacity: 0.85, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
          New Student
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 900, color: "white" }}>Registration</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", maxWidth: 600, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "First Name *", value: firstName, set: setFirstName },
            { label: "Last Name *", value: lastName, set: setLastName },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</label>
              <input type="text" value={value} onChange={e => set(e.target.value)} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Phone</label>
            <input type="tel" value={phone} readOnly style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, backgroundColor: "#f9fafb", color: "#6b7280" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const, backgroundColor: "white" }}>
              <option value="">—</option>
              {GRADES.map(g => <option key={g} value={g}>{g} Grade</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Date of Birth</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Address</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={{ width: "100%", fontSize: 20, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} style={{ width: "100%", fontSize: 18, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>State</label>
            <input type="text" value={stateVal} onChange={e => setStateVal(e.target.value)} maxLength={2} style={{ width: "100%", fontSize: 18, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Zip</label>
            <input type="text" value={zip} onChange={e => setZip(e.target.value)} maxLength={10} style={{ width: "100%", fontSize: 18, padding: "14px 16px", borderRadius: 12, border: "2px solid #e5e7eb", boxSizing: "border-box" as const }} />
          </div>
        </div>
        {submitError && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <p style={{ margin: 0, color: "#dc2626", fontSize: 15, fontWeight: 600 }}>⚠️ {submitError}</p>
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { setStep("phone"); setSubmitError(""); }} style={{ flex: "0 0 auto", padding: "18px 24px", borderRadius: 16, border: "2px solid #e5e7eb", backgroundColor: "white", color: "#6b7280", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>← Back</button>
          <button
            onClick={handleNewStudentSubmit}
            disabled={submitting || !firstName.trim() || !lastName.trim()}
            style={{ flex: 1, padding: "18px", borderRadius: 16, border: "none", backgroundColor: firstName.trim() && lastName.trim() ? ACCENT : "#e5e7eb", color: firstName.trim() && lastName.trim() ? "white" : "#9ca3af", fontSize: 20, fontWeight: 800, cursor: firstName.trim() && lastName.trim() ? "pointer" : "default" }}
          >
            {submitting ? "Checking in…" : "Check In →"}
          </button>
        </div>
      </div>
    </div>
  );

  // STEP: confirm
  return (
    <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: "#111827", marginBottom: 8 }}>You&apos;re checked in!</h1>
        <p style={{ fontSize: 22, color: "#374151", marginBottom: 4 }}>{studentName}</p>
        <p style={{ fontSize: 15, color: "#9ca3af", marginTop: 24 }}>This screen will reset in 5 seconds…</p>
      </div>
    </div>
  );
}
