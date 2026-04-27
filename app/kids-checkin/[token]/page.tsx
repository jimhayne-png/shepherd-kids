"use client";

import { use, useEffect, useState } from "react";

const ACCENT = "#F28C28";
const BG = "#fff7ed";

const GRADES = ["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade"];
const HOW_OPTIONS = ["Friend or Family", "Social Media", "Drive By", "Church Website", "Google Search", "Other"];

type Child = {
  first_name: string; last_name: string; date_of_birth: string;
  grade: string; allergies: string; medical_notes: string; special_instructions: string;
};

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ height: 4, background: "#fde8d0", borderRadius: 2, marginBottom: 24 }}>
      <div style={{ height: 4, background: ACCENT, borderRadius: 2, width: `${(step / total) * 100}%`, transition: "width 0.3s ease" }} />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label}{required && <span style={{ color: ACCENT }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12,
  fontSize: 16, color: "#111827", background: "white", outline: "none",
  boxSizing: "border-box", WebkitAppearance: "none",
};

const btnStyle: React.CSSProperties = {
  width: "100%", padding: "16px", borderRadius: 14, fontSize: 18, fontWeight: 700,
  background: ACCENT, color: "white", border: "none", cursor: "pointer",
  minHeight: 56, transition: "opacity 0.15s",
};

function emptyChild(lastName: string): Child {
  return { first_name: "", last_name: lastName, date_of_birth: "", grade: "3rd Grade", allergies: "", medical_notes: "", special_instructions: "" };
}

export default function KidsCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [step, setStep] = useState(0); // 0=loading, 1=welcome, 2=parents, 3=children, 4=how, 5=success
  const [churchName, setChurchName] = useState("Our Church");
  const [error, setError] = useState("");

  // Parent info
  const [p1First, setP1First] = useState(""); const [p1Last, setP1Last] = useState("");
  const [p1Email, setP1Email] = useState(""); const [p1Phone, setP1Phone] = useState("");
  const [showP2, setShowP2] = useState(false);
  const [p2First, setP2First] = useState(""); const [p2Last, setP2Last] = useState("");
  const [p2Email, setP2Email] = useState(""); const [p2Phone, setP2Phone] = useState("");

  // Children
  const [children, setChildren] = useState<Child[]>([emptyChild("")]);

  // How did you hear
  const [howHeard, setHowHeard] = useState("");
  const [howDetails, setHowDetails] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [familyId, setFamilyId] = useState("");

  useEffect(() => {
    fetch(`/api/children-ministry/visitor-flow/${token}`)
      .then(async r => {
        if (!r.ok) { setError("This check-in point is not available."); setStep(-1); return; }
        const d = await r.json();
        setChurchName(d.church_name ?? "Our Church");
        setStep(1);
      })
      .catch(() => { setError("Unable to connect. Please try again."); setStep(-1); });
  }, [token]);

  function updateChild(idx: number, field: keyof Child, value: string) {
    setChildren(cs => cs.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  function addChild() {
    setChildren(cs => [...cs, emptyChild(p1Last)]);
  }

  function removeChild(idx: number) {
    if (children.length <= 1) return;
    setChildren(cs => cs.filter((_, i) => i !== idx));
  }

  function validateStep2() {
    if (!p1First.trim()) return "Please enter your first name.";
    if (!p1Last.trim()) return "Please enter your last name.";
    if (!p1Phone.trim()) return "Please enter your phone number.";
    if (!p1Email.trim()) return "Please enter your email address.";
    return null;
  }

  function validateStep3() {
    for (let i = 0; i < children.length; i++) {
      if (!children[i].first_name.trim()) return `Please enter your child's first name (child ${i + 1}).`;
    }
    return null;
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch(`/api/children-ministry/visitor-flow/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent1_first_name: p1First.trim(), parent1_last_name: p1Last.trim(),
          parent1_email: p1Email.trim(), parent1_phone: p1Phone.trim(),
          parent2_first_name: p2First.trim() || undefined, parent2_last_name: p2Last.trim() || undefined,
          parent2_email: p2Email.trim() || undefined, parent2_phone: p2Phone.trim() || undefined,
          how_did_you_hear: howDetails.trim() ? `${howHeard}: ${howDetails}` : howHeard || undefined,
          children: children.filter(c => c.first_name.trim()).map(c => ({
            first_name: c.first_name.trim(), last_name: c.last_name.trim() || p1Last.trim(),
            date_of_birth: c.date_of_birth || undefined, grade: c.grade,
            allergies: c.allergies.trim() || undefined, medical_notes: c.medical_notes.trim() || undefined,
            special_instructions: c.special_instructions.trim() || undefined,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setSubmitError(d.error ?? "Something went wrong."); setSubmitting(false); return; }
      setFamilyId(d.family_id);
      setStep(5);
    } catch {
      setSubmitError("Unable to submit. Please check your connection.");
    }
    setSubmitting(false);
  }

  // ---- Loading / Error ----
  if (step === 0) return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9ca3af", fontSize: 16 }}>Loading…</p>
    </div>
  );

  if (step === -1) return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <p style={{ fontSize: 18, color: "#374151", fontWeight: 600 }}>Check-In Unavailable</p>
        <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>{error}</p>
      </div>
    </div>
  );

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight: "100dvh", background: BG, padding: "24px 20px 48px", maxWidth: 480, margin: "0 auto" }}>
      {children}
    </div>
  );

  // ---- Step 1: Welcome ----
  if (step === 1) return wrap(
    <div style={{ paddingTop: 48 }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ width: 80, height: 80, background: ACCENT, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 24px" }}>🧒</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 12px", lineHeight: 1.2 }}>Welcome!</h1>
        <p style={{ fontSize: 18, color: "#374151", margin: "0 0 8px", fontWeight: 600 }}>Let's get your family checked in.</p>
        <p style={{ fontSize: 15, color: "#9ca3af", margin: 0 }}>This takes less than a minute ⚡</p>
      </div>
      <button onClick={() => setStep(2)} style={btnStyle}>Get Started →</button>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#d1d5db" }}>Returning family? Sign in here (coming soon)</p>
    </div>
  );

  // ---- Step 2: Parent Info ----
  if (step === 2) return wrap(<>
    <ProgressBar step={1} total={3} />
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Your Information</h2>
    <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>Step 1 of 3 — Parent or guardian</p>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
      <Field label="First name" required>
        <input style={inputStyle} value={p1First} onChange={e => setP1First(e.target.value)} placeholder="Jane" autoComplete="given-name" />
      </Field>
      <Field label="Last name" required>
        <input style={inputStyle} value={p1Last} onChange={e => setP1Last(e.target.value)} placeholder="Smith" autoComplete="family-name" />
      </Field>
    </div>
    <Field label="Mobile phone" required>
      <input style={inputStyle} type="tel" value={p1Phone} onChange={e => setP1Phone(e.target.value)} placeholder="(555) 000-0000" autoComplete="tel" />
    </Field>
    <Field label="Email address" required>
      <input style={inputStyle} type="email" value={p1Email} onChange={e => setP1Email(e.target.value)} placeholder="jane@email.com" autoComplete="email" />
    </Field>

    {!showP2 ? (
      <button onClick={() => setShowP2(true)} style={{ background: "none", border: "none", color: ACCENT, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "8px 0", marginBottom: 16 }}>
        + Add second parent / guardian
      </button>
    ) : (
      <div style={{ borderTop: "2px dashed #fde8d0", paddingTop: 16, marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Second parent / guardian (optional)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name"><input style={inputStyle} value={p2First} onChange={e => setP2First(e.target.value)} placeholder="John" /></Field>
          <Field label="Last name"><input style={inputStyle} value={p2Last} onChange={e => setP2Last(e.target.value)} placeholder="Smith" /></Field>
        </div>
        <Field label="Phone"><input style={inputStyle} type="tel" value={p2Phone} onChange={e => setP2Phone(e.target.value)} placeholder="(555) 000-0000" /></Field>
        <Field label="Email"><input style={inputStyle} type="email" value={p2Email} onChange={e => setP2Email(e.target.value)} placeholder="john@email.com" /></Field>
      </div>
    )}

    {error && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 12 }}>{error}</p>}
    <button onClick={() => { const err = validateStep2(); if (err) { setError(err); return; } setError(""); setChildren([emptyChild(p1Last)]); setStep(3); }} style={btnStyle}>
      Continue →
    </button>
    <button onClick={() => setStep(1)} style={{ ...btnStyle, background: "none", color: "#9ca3af", border: "2px solid #e5e7eb", marginTop: 12, fontSize: 15 }}>← Back</button>
  </>);

  // ---- Step 3: Children ----
  if (step === 3) return wrap(<>
    <ProgressBar step={2} total={3} />
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Your Children</h2>
    <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>Step 2 of 3 — Who's joining us today?</p>

    {children.map((child, idx) => (
      <div key={idx} style={{ background: "white", borderRadius: 16, padding: "20px 16px", marginBottom: 16, border: "2px solid #fde8d0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: ACCENT, margin: 0 }}>Child {idx + 1}</p>
          {children.length > 1 && <button onClick={() => removeChild(idx)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name" required>
            <input style={inputStyle} value={child.first_name} onChange={e => updateChild(idx, "first_name", e.target.value)} placeholder="Emma" />
          </Field>
          <Field label="Last name">
            <input style={inputStyle} value={child.last_name} onChange={e => updateChild(idx, "last_name", e.target.value)} placeholder={p1Last} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date of birth">
            <input style={inputStyle} type="date" value={child.date_of_birth} onChange={e => updateChild(idx, "date_of_birth", e.target.value)} />
          </Field>
          <Field label="Grade">
            <select style={{ ...inputStyle, paddingRight: 8 }} value={child.grade} onChange={e => updateChild(idx, "grade", e.target.value)}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Allergies (optional)">
          <input style={inputStyle} value={child.allergies} onChange={e => updateChild(idx, "allergies", e.target.value)} placeholder="Peanuts, dairy…" />
        </Field>
        <Field label="Medical notes (optional)">
          <input style={inputStyle} value={child.medical_notes} onChange={e => updateChild(idx, "medical_notes", e.target.value)} placeholder="Inhaler, EpiPen…" />
        </Field>
        <Field label="Special instructions (optional)">
          <input style={inputStyle} value={child.special_instructions} onChange={e => updateChild(idx, "special_instructions", e.target.value)} placeholder="Only mom/dad can pick up" />
        </Field>
      </div>
    ))}

    {children.length < 6 && (
      <button onClick={addChild} style={{ ...btnStyle, background: "white", color: ACCENT, border: `2px solid ${ACCENT}`, marginBottom: 16, fontSize: 15 }}>
        + Add Another Child
      </button>
    )}

    {error && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 12 }}>{error}</p>}
    <button onClick={() => { const err = validateStep3(); if (err) { setError(err); return; } setError(""); setStep(4); }} style={btnStyle}>
      Continue →
    </button>
    <button onClick={() => setStep(2)} style={{ ...btnStyle, background: "none", color: "#9ca3af", border: "2px solid #e5e7eb", marginTop: 12, fontSize: 15 }}>← Back</button>
  </>);

  // ---- Step 4: How did you hear ----
  if (step === 4) return wrap(<>
    <ProgressBar step={3} total={3} />
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>One last thing!</h2>
    <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>Step 3 of 3</p>

    <Field label="How did you hear about us? (optional)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {HOW_OPTIONS.map(opt => (
          <button key={opt} onClick={() => setHowHeard(opt)} style={{ padding: "12px 10px", borderRadius: 12, border: `2px solid ${howHeard === opt ? ACCENT : "#e5e7eb"}`, background: howHeard === opt ? "#fff7ed" : "white", color: howHeard === opt ? "#9a3412" : "#374151", fontSize: 14, fontWeight: howHeard === opt ? 700 : 400, cursor: "pointer" }}>
            {opt}
          </button>
        ))}
      </div>
      {howHeard === "Other" && (
        <input style={inputStyle} value={howDetails} onChange={e => setHowDetails(e.target.value)} placeholder="Tell us more…" />
      )}
    </Field>

    {submitError && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 12 }}>{submitError}</p>}
    <button onClick={handleSubmit} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
      {submitting ? "Submitting…" : "Complete Check-In ✓"}
    </button>
    <button onClick={() => setStep(3)} style={{ ...btnStyle, background: "none", color: "#9ca3af", border: "2px solid #e5e7eb", marginTop: 12, fontSize: 15 }}>← Back</button>
  </>);

  // ---- Step 5: Success ----
  if (step === 5) return wrap(
    <div style={{ paddingTop: 32, textAlign: "center" }}>
      <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 28px" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>✓</div>
        <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "4px solid #86efac", animation: "none", opacity: 0.6 }} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>Welcome to {churchName}!</h1>
      <p style={{ fontSize: 17, color: "#374151", margin: "0 0 8px" }}>Your children have been checked in 🎉</p>
      <div style={{ background: "white", borderRadius: 16, padding: "16px 20px", margin: "24px 0", border: "2px solid #fde8d0", textAlign: "left" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Checked in today</p>
        {children.filter(c => c.first_name.trim()).map((c, i) => (
          <p key={i} style={{ fontSize: 16, color: "#111827", margin: "4px 0", fontWeight: 600 }}>🧒 {c.first_name} {c.last_name || p1Last}</p>
        ))}
      </div>
      {p1Email && <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 32px" }}>A welcome message has been sent to <strong>{p1Email}</strong></p>}
      <p style={{ fontSize: 17, color: ACCENT, fontWeight: 700 }}>We can't wait to see you again! 🙏</p>
    </div>
  );

  return null;
}
