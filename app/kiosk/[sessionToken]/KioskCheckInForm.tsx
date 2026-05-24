"use client";

import { useState } from "react";

const ACCENT = "#F28C28";

const ALLERGY_OPTIONS = [
  "No Known Allergies",
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat / Gluten",
  "Shellfish",
  "Bee Stings",
  "Medication Allergy",
  "Asthma",
  "EpiPen Required",
  "Other",
] as const;

type Room = { id: string; name: string };

type LookupFamily = {
  id: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail: string | null;
};

type LookupChild = {
  id: string;
  name: string;
  source: "visitor";
  dateOfBirth: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  specialInstructions: string | null;
};

type AllergyState = {
  allergies: string[];
  allergyOther: string;
  medicalNotes: string;
  specialInstructions: string;
};

type ExistingChildState = {
  id: string;
  name: string;
  source: "visitor";
  selected: boolean;
  roomId: string;
  dateOfBirth: string;
} & AllergyState;

type NewChildForm = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  roomId: string;
} & AllergyState;

type Step = "phone" | "returning" | "new" | "success";

type Props = {
  sessionToken: string;
  serviceName: string;
  serviceDate: string;
  rooms: Room[];
  churchName: string;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseAllergyState(raw: string | null): Pick<AllergyState, "allergies" | "allergyOther"> {
  if (!raw) return { allergies: [], allergyOther: "" };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { allergies: [], allergyOther: "" };
    let allergyOther = "";
    const allergies = parsed.map((a: string) => {
      if (typeof a === "string" && a.startsWith("Other: ")) {
        allergyOther = a.slice(7);
        return "Other";
      }
      return a;
    });
    return { allergies, allergyOther };
  } catch {
    return { allergies: [], allergyOther: "" };
  }
}

function emptyNewChild(): NewChildForm {
  return {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    roomId: "",
    allergies: [],
    allergyOther: "",
    medicalNotes: "",
    specialInstructions: "",
  };
}

const today = new Date().toISOString().slice(0, 10);

function RoomSelect({
  value,
  onChange,
  rooms,
}: {
  value: string;
  onChange: (v: string) => void;
  rooms: Room[];
}) {
  if (rooms.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 16,
        padding: "12px 14px",
        borderRadius: 12,
        border: "2px solid #e5e7eb",
        backgroundColor: "white",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <option value="">Room (optional)</option>
      {rooms.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

export default function KioskCheckInForm({
  sessionToken,
  serviceName,
  serviceDate,
  rooms,
  churchName,
}: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  // Shared email state (prefilled from lookup for returning, entered fresh for new)
  const [parentEmail, setParentEmail] = useState("");

  // Returning family state
  const [family, setFamily] = useState<LookupFamily | null>(null);
  const [existingChildren, setExistingChildren] = useState<ExistingChildState[]>([]);
  const [addedChildren, setAddedChildren] = useState<NewChildForm[]>([]);

  // New family state
  const [parentName, setParentName] = useState("");
  const [newFamilyChildren, setNewFamilyChildren] = useState<NewChildForm[]>([
    emptyNewChild(),
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [securityCode, setSecurityCode] = useState<string | null>(null);

  // ── Lookup ──────────────────────────────────────────────────────────────

  async function handleLookup() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setLookupError("Please enter a valid phone number.");
      return;
    }
    setLooking(true);
    setLookupError("");

    const res = await fetch(`/api/kiosk/${sessionToken}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentPhone: digits }),
    });

    const data = await res.json();
    setLooking(false);

    if (!res.ok) {
      setLookupError(data.error ?? "Lookup failed. Please try again.");
      return;
    }

    if (data.found) {
      setFamily(data.family);
      setParentEmail(data.family.parentEmail ?? "");
      setExistingChildren(
        (data.children as LookupChild[]).map((c) => {
          const { allergies, allergyOther } = parseAllergyState(c.allergies);
          return {
            id: c.id,
            name: c.name,
            source: c.source,
            selected: true,
            roomId: "",
            dateOfBirth: c.dateOfBirth ?? "",
            allergies,
            allergyOther,
            medicalNotes: c.medicalNotes ?? "",
            specialInstructions: c.specialInstructions ?? "",
          };
        }),
      );
      setAddedChildren([]);
      setStep("returning");
    } else {
      setParentName("");
      setParentEmail("");
      setNewFamilyChildren([emptyNewChild()]);
      setStep("new");
    }
  }

  // ── Returning submit ────────────────────────────────────────────────────

  async function handleReturningSubmit() {
    if (!family) return;
    const selected = existingChildren.filter((c) => c.selected);
    const additions = addedChildren.filter(
      (c) => c.firstName.trim() && c.lastName.trim(),
    );
    if (selected.length + additions.length === 0) return;

    setSubmitting(true);
    setSubmitError("");

    const children = [
      ...selected.map((c) => ({
        childName: c.name,
        childId: c.id,
        childDateOfBirth: c.dateOfBirth || undefined,
        roomId: c.roomId || undefined,
        isNew: false,
        allergies: c.allergies,
        allergyOther: c.allergyOther,
        medicalNotes: c.medicalNotes,
        specialInstructions: c.specialInstructions,
      })),
      ...additions.map((c) => ({
        childName: `${c.firstName.trim()} ${c.lastName.trim()}`,
        childFirstName: c.firstName.trim(),
        childLastName: c.lastName.trim(),
        childDateOfBirth: c.dateOfBirth || undefined,
        roomId: c.roomId || undefined,
        isNew: true,
        allergies: c.allergies,
        allergyOther: c.allergyOther,
        medicalNotes: c.medicalNotes,
        specialInstructions: c.specialInstructions,
      })),
    ];

    const res = await fetch(`/api/kiosk/${sessionToken}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName: `${family.parentFirstName} ${family.parentLastName}`.trim(),
        parentPhone: family.parentPhone,
        parentEmail: parentEmail.trim() || undefined,
        familyId: family.id,
        isNewFamily: false,
        children,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "Check-in failed. Please try again.");
      return;
    }
    setSecurityCode(data.securityCode);
    setStep("success");
  }

  // ── New family submit ───────────────────────────────────────────────────

  async function handleNewFamilySubmit() {
    const validChildren = newFamilyChildren.filter(
      (c) => c.firstName.trim() && c.lastName.trim(),
    );
    if (
      !parentName.trim() ||
      phone.replace(/\D/g, "").length < 7 ||
      validChildren.length === 0
    ) return;

    setSubmitting(true);
    setSubmitError("");

    const children = validChildren.map((c) => ({
      childName: `${c.firstName.trim()} ${c.lastName.trim()}`,
      childFirstName: c.firstName.trim(),
      childLastName: c.lastName.trim(),
      childDateOfBirth: c.dateOfBirth || undefined,
      roomId: c.roomId || undefined,
      isNew: true,
      allergies: c.allergies,
      allergyOther: c.allergyOther,
      medicalNotes: c.medicalNotes,
      specialInstructions: c.specialInstructions,
    }));

    const res = await fetch(`/api/kiosk/${sessionToken}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName: parentName.trim(),
        parentPhone: phone.replace(/\D/g, ""),
        parentEmail: parentEmail.trim() || undefined,
        isNewFamily: true,
        children,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "Check-in failed. Please try again.");
      return;
    }
    setSecurityCode(data.securityCode);
    setStep("success");
  }

  function reset() {
    setStep("phone");
    setPhone("");
    setLookupError("");
    setParentEmail("");
    setFamily(null);
    setExistingChildren([]);
    setAddedChildren([]);
    setParentName("");
    setNewFamilyChildren([emptyNewChild()]);
    setSubmitError("");
    setSecurityCode(null);
  }

  const serviceSubtitle = `${serviceName} · ${fmtDate(serviceDate)}`;

  function Header({ title, green }: { title: string; green?: boolean }) {
    return (
      <div
        style={{
          backgroundColor: green ? "#16a34a" : ACCENT,
          padding: "24px 32px",
          flexShrink: 0,
        }}
      >
        <p style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>
          {title}
        </p>
        <p style={{ color: "white", opacity: 0.75, fontSize: 14, margin: "4px 0 0" }}>
          {serviceSubtitle}
        </p>
      </div>
    );
  }

  // ── SUCCESS ─────────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#f9fafb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header title="✅ Check-In Complete!" green />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 32px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
            <p style={{ fontSize: 18, color: "#374151", marginBottom: 8 }}>
              Your family security code is:
            </p>
            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "3px solid #22c55e",
                borderRadius: 20,
                padding: "32px 24px",
                marginBottom: 32,
              }}
            >
              <p
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: "#111827",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {securityCode}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12, marginBottom: 0 }}>
                Show this code at pickup
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                width: "100%",
                padding: "20px",
                borderRadius: 20,
                border: "none",
                backgroundColor: ACCENT,
                color: "white",
                fontSize: 20,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Done (Start Over)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PHONE ────────────────────────────────────────────────────────────────

  if (step === "phone") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#f9fafb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header title="Children's Check-In" />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 32px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 480 }}>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#111827",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Welcome!
            </h1>
            <p
              style={{
                fontSize: 20,
                color: "#6b7280",
                textAlign: "center",
                marginBottom: 40,
              }}
            >
              Enter your phone number to check in
            </p>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setLookupError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="(555) 000-0000"
              autoFocus
              style={{
                width: "100%",
                fontSize: 32,
                padding: "20px 24px",
                borderRadius: 20,
                border: "3px solid #e5e7eb",
                textAlign: "center",
                marginBottom: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {lookupError && (
              <p
                style={{
                  color: "#dc2626",
                  textAlign: "center",
                  marginBottom: 12,
                  fontSize: 16,
                }}
              >
                {lookupError}
              </p>
            )}
            <button
              onClick={handleLookup}
              disabled={looking || phone.replace(/\D/g, "").length < 7}
              style={{
                width: "100%",
                padding: "22px",
                borderRadius: 20,
                border: "none",
                backgroundColor: ACCENT,
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                cursor: looking ? "default" : "pointer",
                opacity: looking ? 0.7 : 1,
              }}
            >
              {looking ? "Looking up…" : "Get Started →"}
            </button>

            <p
              style={{
                fontSize: 13,
                color: "#9ca3af",
                textAlign: "center",
                marginTop: 20,
                lineHeight: 1.6,
              }}
            >
              Your family information is kept private and protected.
              <br />
              Information collected through{" "}
              <strong style={{ color: "#6b7280" }}>
                {churchName || "this ministry"}
              </strong>{" "}
              is never sold or shared outside of this ministry.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── RETURNING ────────────────────────────────────────────────────────────

  if (step === "returning" && family) {
    const anyReady =
      existingChildren.some((c) => c.selected) ||
      addedChildren.some((c) => c.firstName.trim() && c.lastName.trim());

    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#f9fafb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header title="Welcome Back!" />
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px",
            maxWidth: 600,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            {family.parentFirstName} {family.parentLastName}
          </h2>

          {/* Parent email */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Parent Email for Follow-Up
            </label>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="jane@example.com (optional)"
              style={{
                width: "100%",
                fontSize: 18,
                padding: "13px 16px",
                borderRadius: 14,
                border: "2px solid #e5e7eb",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 16 }}>
            Select children to check in today:
          </p>

          {existingChildren.length === 0 && addedChildren.length === 0 && (
            <div
              style={{
                backgroundColor: "#fef9c3",
                border: "1px solid #fde047",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 15,
                color: "#92400e",
              }}
            >
              No saved children found — add one below.
            </div>
          )}

          {/* Saved children */}
          {existingChildren.map((child, i) => (
            <div key={child.id} style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() =>
                  setExistingChildren((cs) =>
                    cs.map((c, j) =>
                      j === i ? { ...c, selected: !c.selected } : c,
                    ),
                  )
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 20px",
                  borderRadius: 16,
                  border: `3px solid ${child.selected ? ACCENT : "#e5e7eb"}`,
                  backgroundColor: child.selected ? ACCENT + "15" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: child.selected ? ACCENT : "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {child.selected && (
                    <span
                      style={{ color: "white", fontWeight: 900, fontSize: 16 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}
                >
                  {child.name}
                </span>
              </button>

              {child.selected && (
                <div style={{ marginTop: 8, paddingLeft: 4 }}>
                  {/* Birthday + Room */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: rooms.length > 0 ? "1fr 1fr" : "1fr",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#6b7280",
                          marginBottom: 4,
                        }}
                      >
                        Birthday {child.dateOfBirth ? "" : "(optional)"}
                      </label>
                      <input
                        type="date"
                        value={child.dateOfBirth}
                        max={today}
                        min="2000-01-01"
                        onChange={(e) =>
                          setExistingChildren((cs) =>
                            cs.map((c, j) =>
                              j === i
                                ? { ...c, dateOfBirth: e.target.value }
                                : c,
                            ),
                          )
                        }
                        style={{
                          width: "100%",
                          fontSize: 16,
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: "2px solid #e5e7eb",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                    {rooms.length > 0 && (
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6b7280",
                            marginBottom: 4,
                          }}
                        >
                          Room (optional)
                        </label>
                        <RoomSelect
                          value={child.roomId}
                          onChange={(v) =>
                            setExistingChildren((cs) =>
                              cs.map((c, j) =>
                                j === i ? { ...c, roomId: v } : c,
                              ),
                            )
                          }
                          rooms={rooms}
                        />
                      </div>
                    )}
                  </div>

                  {/* Allergy / medical section */}
                  <AllergySection
                    state={{
                      allergies: child.allergies,
                      allergyOther: child.allergyOther,
                      medicalNotes: child.medicalNotes,
                      specialInstructions: child.specialInstructions,
                    }}
                    onChange={(patch) =>
                      setExistingChildren((cs) =>
                        cs.map((c, j) => (j === i ? { ...c, ...patch } : c)),
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {/* New children added inline */}
          {addedChildren.map((child, i) => (
            <NewChildCard
              key={i}
              child={child}
              index={existingChildren.length + i}
              rooms={rooms}
              onChange={(updated) =>
                setAddedChildren((cs) =>
                  cs.map((c, j) => (j === i ? updated : c)),
                )
              }
              onRemove={() =>
                setAddedChildren((cs) => cs.filter((_, j) => j !== i))
              }
            />
          ))}

          <button
            type="button"
            onClick={() => setAddedChildren((cs) => [...cs, emptyNewChild()])}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 16,
              border: "2px dashed #e5e7eb",
              backgroundColor: "white",
              color: ACCENT,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 24,
            }}
          >
            + Add Another Child
          </button>

          {submitError && (
            <p
              style={{
                color: "#dc2626",
                textAlign: "center",
                marginBottom: 12,
                fontSize: 15,
              }}
            >
              {submitError}
            </p>
          )}

          <button
            onClick={handleReturningSubmit}
            disabled={!anyReady || submitting}
            style={{
              width: "100%",
              padding: "22px",
              borderRadius: 20,
              border: "none",
              backgroundColor: anyReady && !submitting ? ACCENT : "#e5e7eb",
              color: anyReady && !submitting ? "white" : "#9ca3af",
              fontSize: 22,
              fontWeight: 800,
              cursor: anyReady && !submitting ? "pointer" : "default",
              marginBottom: 12,
            }}
          >
            {submitting ? "Checking in…" : "Check In →"}
          </button>
          <button
            onClick={() => {
              setStep("phone");
              setPhone("");
            }}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 20,
              border: "2px solid #e5e7eb",
              backgroundColor: "white",
              color: "#6b7280",
              fontSize: 18,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Different Family
          </button>
        </div>
      </div>
    );
  }

  // ── NEW FAMILY ───────────────────────────────────────────────────────────

  if (step === "new") {
    const validCount = newFamilyChildren.filter(
      (c) => c.firstName.trim() && c.lastName.trim(),
    ).length;
    const canSubmit = !!(
      parentName.trim() &&
      phone.replace(/\D/g, "").length >= 7 &&
      validCount > 0
    );

    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#f9fafb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header title="New Family Registration" />
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px",
            maxWidth: 600,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 20,
            }}
          >
            Parent / Guardian Info
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Full Name *
            </label>
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Jane Smith"
              autoFocus
              style={{
                width: "100%",
                fontSize: 22,
                padding: "16px 20px",
                borderRadius: 16,
                border: "2px solid #e5e7eb",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Phone *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              style={{
                width: "100%",
                fontSize: 22,
                padding: "16px 20px",
                borderRadius: 16,
                border: "2px solid #e5e7eb",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label
              style={{
                display: "block",
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Parent Email *
            </label>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              style={{
                width: "100%",
                fontSize: 22,
                padding: "16px 20px",
                borderRadius: 16,
                border: "2px solid #e5e7eb",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 16,
            }}
          >
            Children
          </h3>

          {newFamilyChildren.map((child, i) => (
            <NewChildCard
              key={i}
              child={child}
              index={i}
              rooms={rooms}
              onChange={(updated) =>
                setNewFamilyChildren((cs) =>
                  cs.map((c, j) => (j === i ? updated : c)),
                )
              }
              onRemove={
                newFamilyChildren.length > 1
                  ? () =>
                      setNewFamilyChildren((cs) =>
                        cs.filter((_, j) => j !== i),
                      )
                  : undefined
              }
            />
          ))}

          <button
            type="button"
            onClick={() =>
              setNewFamilyChildren((cs) => [...cs, emptyNewChild()])
            }
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 16,
              border: "2px dashed #e5e7eb",
              backgroundColor: "white",
              color: ACCENT,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            + Add Another Child
          </button>

          <p
            style={{
              fontSize: 13,
              color: "#9ca3af",
              textAlign: "center",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            Your family information is kept private and protected.
            <br />
            Information collected through{" "}
            <strong style={{ color: "#6b7280" }}>
              {churchName || "this ministry"}
            </strong>{" "}
            is never sold or shared outside of this ministry.
          </p>

          {submitError && (
            <p
              style={{
                color: "#dc2626",
                textAlign: "center",
                marginBottom: 12,
                fontSize: 15,
              }}
            >
              {submitError}
            </p>
          )}

          <button
            onClick={handleNewFamilySubmit}
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
              marginBottom: 12,
            }}
          >
            {submitting ? "Checking in…" : "Check In →"}
          </button>
          <button
            onClick={() => setStep("phone")}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 20,
              border: "2px solid #e5e7eb",
              backgroundColor: "white",
              color: "#6b7280",
              fontSize: 18,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Allergy / medical section ────────────────────────────────────────────────

function AllergySection({
  state,
  onChange,
}: {
  state: AllergyState;
  onChange: (patch: Partial<AllergyState>) => void;
}) {
  function toggle(label: string) {
    const isSelected = state.allergies.includes(label);
    if (label === "No Known Allergies") {
      onChange({
        allergies: isSelected ? [] : ["No Known Allergies"],
        allergyOther: "",
      });
    } else {
      let next: string[];
      if (isSelected) {
        next = state.allergies.filter((a) => a !== label);
      } else {
        next = [...state.allergies.filter((a) => a !== "No Known Allergies"), label];
      }
      const patch: Partial<AllergyState> = { allergies: next };
      if (isSelected && label === "Other") patch.allergyOther = "";
      onChange(patch);
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 16px",
        backgroundColor: "#fafafa",
        borderRadius: 14,
        border: "1px solid #e5e7eb",
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#374151",
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Allergies / Medical Concerns
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 7,
          marginBottom: 10,
        }}
      >
        {ALLERGY_OPTIONS.map((opt) => {
          const selected = state.allergies.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `2px solid ${selected ? ACCENT : "#e5e7eb"}`,
                backgroundColor: selected ? ACCENT + "18" : "white",
                color: selected ? "#78350f" : "#4b5563",
                fontSize: 13,
                fontWeight: selected ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
                lineHeight: 1.3,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `2px solid ${selected ? ACCENT : "#d1d5db"}`,
                  backgroundColor: selected ? ACCENT : "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  color: "white",
                  fontWeight: 900,
                }}
              >
                {selected ? "✓" : ""}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {state.allergies.includes("Other") && (
        <textarea
          value={state.allergyOther}
          onChange={(e) => onChange({ allergyOther: e.target.value })}
          placeholder="Please describe"
          rows={2}
          style={{
            width: "100%",
            fontSize: 14,
            padding: "10px 12px",
            borderRadius: 10,
            border: "2px solid #e5e7eb",
            boxSizing: "border-box",
            resize: "vertical",
            marginBottom: 10,
            outline: "none",
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Medical Notes (optional)
          </label>
          <textarea
            value={state.medicalNotes}
            onChange={(e) => onChange({ medicalNotes: e.target.value })}
            placeholder="e.g. carries EpiPen, uses inhaler"
            rows={2}
            style={{
              width: "100%",
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: 10,
              border: "2px solid #e5e7eb",
              boxSizing: "border-box",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Special Instructions (optional)
          </label>
          <textarea
            value={state.specialInstructions}
            onChange={(e) => onChange({ specialInstructions: e.target.value })}
            placeholder="e.g. bathroom reminder every hour"
            rows={2}
            style={{
              width: "100%",
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: 10,
              border: "2px solid #e5e7eb",
              boxSizing: "border-box",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Shared new-child card ────────────────────────────────────────────────────

function NewChildCard({
  child,
  index,
  rooms,
  onChange,
  onRemove,
}: {
  child: NewChildForm;
  index: number;
  rooms: Room[];
  onChange: (c: NewChildForm) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "2px solid #e5e7eb",
        borderRadius: 16,
        padding: "16px 20px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
          Child {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              color: "#dc2626",
              fontWeight: 700,
              background: "none",
              border: "none",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <input
          value={child.firstName}
          onChange={(e) => onChange({ ...child, firstName: e.target.value })}
          placeholder="First name *"
          style={{
            fontSize: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <input
          value={child.lastName}
          onChange={(e) => onChange({ ...child, lastName: e.target.value })}
          placeholder="Last name *"
          style={{
            fontSize: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: rooms.length > 0 ? "1fr 1fr" : "1fr",
          gap: 10,
          marginBottom: 4,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Birthday (optional)
          </label>
          <input
            type="date"
            value={child.dateOfBirth}
            max={today}
            min="2000-01-01"
            onChange={(e) => onChange({ ...child, dateOfBirth: e.target.value })}
            style={{
              width: "100%",
              fontSize: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
        {rooms.length > 0 && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              Room (optional)
            </label>
            <RoomSelect
              value={child.roomId}
              onChange={(v) => onChange({ ...child, roomId: v })}
              rooms={rooms}
            />
          </div>
        )}
      </div>

      <AllergySection
        state={{
          allergies: child.allergies,
          allergyOther: child.allergyOther,
          medicalNotes: child.medicalNotes,
          specialInstructions: child.specialInstructions,
        }}
        onChange={(patch) => onChange({ ...child, ...patch })}
      />
    </div>
  );
}
