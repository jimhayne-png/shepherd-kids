"use client";

import { useState } from "react";

const ACCENT = "#F28C28";

type Room = { id: string; name: string };

type LookupFamily = {
  id: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
};

type LookupChild = {
  id: string;
  name: string;
  source: "visitor";
};

type ExistingChildState = LookupChild & { selected: boolean; roomId: string };

type NewChildForm = { firstName: string; lastName: string; childAge: string; roomId: string };

type Step = "phone" | "returning" | "new" | "success";

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

function emptyNewChild(): NewChildForm {
  return { firstName: "", lastName: "", childAge: "", roomId: "" };
}

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
}: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const [family, setFamily] = useState<LookupFamily | null>(null);
  const [existingChildren, setExistingChildren] = useState<ExistingChildState[]>([]);
  const [addedChildren, setAddedChildren] = useState<NewChildForm[]>([]);

  const [parentName, setParentName] = useState("");
  const [newFamilyChildren, setNewFamilyChildren] = useState<NewChildForm[]>([
    emptyNewChild(),
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [securityCode, setSecurityCode] = useState<string | null>(null);

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
      setExistingChildren(
        (data.children as LookupChild[]).map((c) => ({
          ...c,
          selected: true,
          roomId: "",
        })),
      );
      setAddedChildren([]);
      setStep("returning");
    } else {
      setParentName("");
      setNewFamilyChildren([emptyNewChild()]);
      setStep("new");
    }
  }

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
        roomId: c.roomId || undefined,
        isNew: false,
      })),
      ...additions.map((c) => ({
        childName: `${c.firstName.trim()} ${c.lastName.trim()}`,
        childFirstName: c.firstName.trim(),
        childLastName: c.lastName.trim(),
        childAge: c.childAge ? Number(c.childAge) : undefined,
        roomId: c.roomId || undefined,
        isNew: true,
      })),
    ];

    const res = await fetch(`/api/kiosk/${sessionToken}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName: `${family.parentFirstName} ${family.parentLastName}`.trim(),
        parentPhone: family.parentPhone,
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

  async function handleNewFamilySubmit() {
    const validChildren = newFamilyChildren.filter(
      (c) => c.firstName.trim() && c.lastName.trim(),
    );

    if (!parentName.trim() || phone.replace(/\D/g, "").length < 7 || validChildren.length === 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const children = validChildren.map((c) => ({
      childName: `${c.firstName.trim()} ${c.lastName.trim()}`,
      childFirstName: c.firstName.trim(),
      childLastName: c.lastName.trim(),
      childAge: c.childAge ? Number(c.childAge) : undefined,
      roomId: c.roomId || undefined,
      isNew: true,
    }));

    const res = await fetch(`/api/kiosk/${sessionToken}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentName: parentName.trim(),
        parentPhone: phone.replace(/\D/g, ""),
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
    setFamily(null);
    setExistingChildren([]);
    setAddedChildren([]);
    setParentName("");
    setNewFamilyChildren([emptyNewChild()]);
    setSubmitError("");
    setSecurityCode(null);
  }

  const header = (title: string, subtitle?: string) => (
    <div style={{ backgroundColor: ACCENT, padding: "24px 32px", flexShrink: 0 }}>
      <p style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ color: "white", opacity: 0.75, fontSize: 14, margin: "4px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const serviceSubtitle = `${serviceName} · ${fmtDate(serviceDate)}`;

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
        <div style={{ backgroundColor: "#16a34a", padding: "24px 32px" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>
            ✅ Check-In Complete!
          </p>
          <p style={{ color: "white", opacity: 0.75, fontSize: 14, margin: "4px 0 0" }}>
            {serviceSubtitle}
          </p>
        </div>

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
        {header("Children's Check-In", serviceSubtitle)}

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

            <p
              style={{
                color: "#6b7280",
                fontSize: 14,
                textAlign: "center",
                marginTop: 4,
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              Your family information is kept private and protected.
              <br />
              This ministry check-in system never sells your information.
            </p>

            {lookupError && (
              <p style={{ color: "#dc2626", textAlign: "center", marginBottom: 12, fontSize: 16 }}>
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
          </div>
        </div>
      </div>
    );
  }

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
        {header("Welcome Back!", serviceSubtitle)}

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
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
            {family.parentFirstName} {family.parentLastName}
          </h2>

          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 24 }}>
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

          {existingChildren.map((child, i) => (
            <div key={child.id} style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() =>
                  setExistingChildren((cs) =>
                    cs.map((c, j) => (j === i ? { ...c, selected: !c.selected } : c)),
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
                  backgroundColor: child.selected ? `${ACCENT}15` : "white",
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
                    <span style={{ color: "white", fontWeight: 900, fontSize: 16 }}>✓</span>
                  )}
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  {child.name}
                </span>
              </button>

              {child.selected && rooms.length > 0 && (
                <div style={{ marginTop: 6, paddingLeft: 4 }}>
                  <RoomSelect
                    value={child.roomId}
                    onChange={(v) =>
                      setExistingChildren((cs) =>
                        cs.map((c, j) => (j === i ? { ...c, roomId: v } : c)),
                      )
                    }
                    rooms={rooms}
                  />
                </div>
              )}
            </div>
          ))}

          {addedChildren.map((child, i) => (
            <NewChildCard
              key={i}
              child={child}
              index={i}
              rooms={rooms}
              onChange={(updated) =>
                setAddedChildren((cs) => cs.map((c, j) => (j === i ? updated : c)))
              }
              onRemove={() => setAddedChildren((cs) => cs.filter((_, j) => j !== i))}
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
            <p style={{ color: "#dc2626", textAlign: "center", marginBottom: 12, fontSize: 15 }}>
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
        {header("New Family Registration", serviceSubtitle)}

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
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 20 }}>
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

          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 16 }}>
            Children
          </h3>

          {newFamilyChildren.map((child, i) => (
            <NewChildCard
              key={i}
              child={child}
              index={i}
              rooms={rooms}
              onChange={(updated) =>
                setNewFamilyChildren((cs) => cs.map((c, j) => (j === i ? updated : c)))
              }
              onRemove={
                newFamilyChildren.length > 1
                  ? () => setNewFamilyChildren((cs) => cs.filter((_, j) => j !== i))
                  : undefined
              }
            />
          ))}

          <button
            type="button"
            onClick={() => setNewFamilyChildren((cs) => [...cs, emptyNewChild()])}
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
            <p style={{ color: "#dc2626", textAlign: "center", marginBottom: 12, fontSize: 15 }}>
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
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={18}
          value={child.childAge}
          onChange={(e) => onChange({ ...child, childAge: e.target.value })}
          placeholder="Age"
          style={{
            fontSize: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {rooms.length > 0 && (
          <RoomSelect
            value={child.roomId}
            onChange={(v) => onChange({ ...child, roomId: v })}
            rooms={rooms}
          />
        )}
      </div>
    </div>
  );
}