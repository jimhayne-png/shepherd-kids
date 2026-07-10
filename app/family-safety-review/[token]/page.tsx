"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PURPLE = "#7B2CBF";
const GOLD = "#D4AF37";
const LIGHT_BG = "#F8F7FF";
const CARD_BG = "#FFFFFF";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const ERROR_COLOR = "#dc2626";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade: string;
  allergies: string;
  medical_notes: string;
  special_instructions: string;
  authorized_pickups: string;
  photo_permission_status: "not_reviewed" | "granted" | "denied";
};

type Family = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_email: string;
  parent1_phone: string;
  parent2_first_name: string;
  parent2_last_name: string;
  parent2_email: string;
  parent2_phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

type FormState = {
  family: Family;
  children: Child[];
  confirmationAccepted: boolean;
  submittedName: string;
  submittedEmail: string;
};

type PageState =
  | { phase: "loading" }
  | { phase: "error"; code: "invalid_token" | "expired" | "already_completed" | "network" }
  | { phase: "form"; data: FormState }
  | { phase: "submitting" }
  | { phase: "success" };

const str = (v: string | null | undefined) => v ?? "";

function inp(
  label: string,
  value: string,
  onChange: (v: string) => void,
  opts?: { type?: string; placeholder?: string; required?: boolean; error?: string },
) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
        {label}
        {opts?.required && <span style={{ color: ERROR_COLOR, marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${opts?.error ? ERROR_COLOR : BORDER}`,
          fontSize: 15,
          color: TEXT,
          background: CARD_BG,
          boxSizing: "border-box",
          outline: "none",
        }}
      />
      {opts?.error && (
        <p style={{ fontSize: 12, color: ERROR_COLOR, margin: "4px 0 0" }}>{opts.error}</p>
      )}
    </div>
  );
}

function textarea(
  label: string,
  value: string,
  onChange: (v: string) => void,
  opts?: { placeholder?: string; hint?: string },
) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
        {label}
      </label>
      {opts?.hint && (
        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 6px" }}>{opts.hint}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        rows={3}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          fontSize: 15,
          color: TEXT,
          background: CARD_BG,
          resize: "vertical",
          boxSizing: "border-box",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: PURPLE, margin: 0 }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: MUTED, margin: "4px 0 0" }}>{subtitle}</p>
      )}
    </div>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "28px 0" }} />;
}

export default function FamilySafetyReviewPage() {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [page, setPage] = useState<PageState>({ phase: "loading" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) { setPage({ phase: "error", code: "invalid_token" }); return; }

    try {
      const res = await fetch(`/api/public/family-safety-review/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data.error === "already_completed"
          ? "already_completed"
          : data.error === "expired"
          ? "expired"
          : "invalid_token";
        setPage({ phase: "error", code });
        return;
      }
      const data = await res.json();
      const family: Family = data.family;

      setPage({
        phase: "form",
        data: {
          family: {
            parent1_first_name:       str(family.parent1_first_name),
            parent1_last_name:        str(family.parent1_last_name),
            parent1_email:            str(family.parent1_email),
            parent1_phone:            str(family.parent1_phone),
            parent2_first_name:       str(family.parent2_first_name),
            parent2_last_name:        str(family.parent2_last_name),
            parent2_email:            str(family.parent2_email),
            parent2_phone:            str(family.parent2_phone),
            address:                  str(family.address),
            city:                     str(family.city),
            state:                    str(family.state),
            zip:                      str(family.zip),
            emergency_contact_name:   str(family.emergency_contact_name),
            emergency_contact_phone:  str(family.emergency_contact_phone),
          } as Family,
          children: (data.children ?? []).map((c: Child) => ({ ...c })),
          confirmationAccepted: false,
          submittedName:  str(family.parent1_first_name) + " " + str(family.parent1_last_name),
          submittedEmail: str(family.parent1_email),
        },
      });
    } catch {
      setPage({ phase: "error", code: "network" });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function updateFamily(field: keyof Family, value: string) {
    if (page.phase !== "form") return;
    setPage({ ...page, data: { ...page.data, family: { ...page.data.family, [field]: value } } });
  }

  function updateChild(index: number, field: keyof Child, value: string) {
    if (page.phase !== "form") return;
    const children = [...page.data.children];
    children[index] = { ...children[index], [field]: value };
    setPage({ ...page, data: { ...page.data, children } });
  }

  function validate(data: FormState): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!data.family.parent1_first_name.trim()) errs["p1_first"] = "Required";
    if (!data.family.parent1_last_name.trim()) errs["p1_last"] = "Required";
    if (!data.confirmationAccepted) errs["confirm"] = "You must confirm this information is accurate";
    if (!data.submittedName.trim()) errs["name"] = "Required";
    if (!data.submittedEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.submittedEmail.trim())) {
      errs["email"] = "Valid email required";
    }
    data.children.forEach((child, i) => {
      if (!["granted", "denied"].includes(child.photo_permission_status)) {
        errs[`photo_${i}`] = "Please select Grant or Deny";
      }
    });
    return errs;
  }

  async function handleSubmit() {
    if (page.phase !== "form") return;
    const errs = validate(page.data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSubmitError("Please fix the errors above before submitting.");
      return;
    }

    setPage({ phase: "submitting" });
    setSubmitError(null);

    try {
      const res = await fetch(`/api/public/family-safety-review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: page.data.family,
          children: page.data.children,
          confirmationAccepted: page.data.confirmationAccepted,
          submittedName: page.data.submittedName,
          submittedEmail: page.data.submittedEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "already_completed") {
          setPage({ phase: "success" });
          return;
        }
        setPage({ phase: "error", code: data.error === "expired" ? "expired" : "invalid_token" });
        return;
      }

      setPage({ phase: "success" });
    } catch {
      setPage({ phase: "error", code: "network" });
    }
  }

  // ── Shell ──────────────────────────────────────────────────────────────────

  const shell = (content: React.ReactNode) => (
    <div style={{ background: LIGHT_BG, minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, #08060D 0%, #1C0A30 100%)`,
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px" }}>
          ShepherdKids
        </p>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "Georgia, serif" }}>
          Annual Family Safety Review
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "8px 0 0", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          To help us provide the safest possible environment for your children, please review your
          family&rsquo;s contact information, emergency details, allergies, medical information,
          authorized pickups, and photo permission.
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 48px" }}>
        {content}
      </div>
    </div>
  );

  // ── Error states ───────────────────────────────────────────────────────────

  if (page.phase === "loading") {
    return shell(
      <div style={{ textAlign: "center", paddingTop: 48, color: MUTED }}>Loading…</div>,
    );
  }

  if (page.phase === "error") {
    const msgs: Record<string, { title: string; body: string }> = {
      invalid_token:     { title: "Link Not Found", body: "This review link is not valid. Please contact your church for a new link." },
      expired:           { title: "Link Expired", body: "This review link has expired. Please contact your church to generate a new one." },
      already_completed: { title: "Already Submitted", body: "This family safety review has already been completed. Thank you!" },
      network:           { title: "Something Went Wrong", body: "We couldn't load your review. Please check your connection and try again." },
    };
    const errCode = (page as { phase: "error"; code: string }).code;
    const { title, body } = msgs[errCode] ?? msgs.invalid_token;

    return shell(
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>{title}</h2>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{body}</p>
      </div>,
    );
  }

  if (page.phase === "success") {
    return shell(
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: "48px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 12px", fontFamily: "Georgia, serif" }}>
          Thank you!
        </h2>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.7, margin: "0 0 8px" }}>
          Your family&rsquo;s information has been reviewed and updated.
        </p>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          Your church now has the current information needed to care for your children safely.
        </p>
      </div>,
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  if (page.phase !== "form" && page.phase !== "submitting") return null;
  const data = page.phase === "form" ? page.data : null;
  if (!data) return null;

  const { family, children } = data;

  const card = (content: React.ReactNode) => (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "28px 24px",
        marginBottom: 20,
      }}
    >
      {content}
    </div>
  );

  return shell(
    <>
      {/* Section 1: Family Contact */}
      {card(
        <>
          <SectionHeader
            title="Family Contact Information"
            subtitle="Please review and update your family's contact details."
          />

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Primary Parent / Guardian
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {inp("First Name", family.parent1_first_name, (v) => updateFamily("parent1_first_name", v), { required: true, error: errors["p1_first"] })}
              {inp("Last Name", family.parent1_last_name, (v) => updateFamily("parent1_last_name", v), { required: true, error: errors["p1_last"] })}
            </div>
            {inp("Phone", family.parent1_phone, (v) => updateFamily("parent1_phone", v), { type: "tel", placeholder: "e.g. 555-867-5309" })}
            {inp("Email", family.parent1_email, (v) => updateFamily("parent1_email", v), { type: "email", placeholder: "e.g. smith@email.com" })}
          </div>

          <Divider />

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Second Parent / Guardian
            </p>
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 12px" }}>Optional</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {inp("First Name", family.parent2_first_name, (v) => updateFamily("parent2_first_name", v))}
              {inp("Last Name", family.parent2_last_name, (v) => updateFamily("parent2_last_name", v))}
            </div>
            {inp("Phone", family.parent2_phone, (v) => updateFamily("parent2_phone", v), { type: "tel" })}
            {inp("Email", family.parent2_email, (v) => updateFamily("parent2_email", v), { type: "email" })}
          </div>

          <Divider />

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Home Address
            </p>
            {inp("Street Address", family.address, (v) => updateFamily("address", v))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
              {inp("City", family.city, (v) => updateFamily("city", v))}
              {inp("State", family.state, (v) => updateFamily("state", v), { placeholder: "e.g. TX" })}
              {inp("ZIP", family.zip, (v) => updateFamily("zip", v), { placeholder: "e.g. 75001" })}
            </div>
          </div>

          <Divider />

          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Emergency Contact
            </p>
            {inp("Emergency Contact Name", family.emergency_contact_name, (v) => updateFamily("emergency_contact_name", v), { placeholder: "Name of emergency contact" })}
            {inp("Emergency Contact Phone", family.emergency_contact_phone, (v) => updateFamily("emergency_contact_phone", v), { type: "tel" })}
          </div>
        </>,
      )}

      {/* Section 2: Children */}
      {children.map((child, i) => (
        card(
          <div key={child.id}>
            <SectionHeader
              title={`${child.first_name} ${child.last_name}`}
              subtitle="Please review and update this child's safety information."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {inp("Date of Birth", child.date_of_birth, (v) => updateChild(i, "date_of_birth", v), { type: "date" })}
              {inp("Grade", child.grade, (v) => updateChild(i, "grade", v), { placeholder: "e.g. 2nd" })}
            </div>

            {textarea("Allergies", child.allergies, (v) => updateChild(i, "allergies", v), {
              placeholder: "e.g. Peanuts, Tree Nuts, Other: Shellfish",
              hint: "Separate multiple allergens with commas.",
            })}
            {textarea("Medical Notes", child.medical_notes, (v) => updateChild(i, "medical_notes", v), {
              placeholder: "Any medical conditions, medications, or care needs",
            })}
            {textarea("Special Instructions", child.special_instructions, (v) => updateChild(i, "special_instructions", v), {
              placeholder: "Anything else we should know during check-in",
            })}
            {textarea("Authorized Pickups", child.authorized_pickups, (v) => updateChild(i, "authorized_pickups", v), {
              placeholder: "Names of people authorized to pick up this child",
            })}

            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
                Photo Permission <span style={{ color: ERROR_COLOR }}>*</span>
              </p>
              <p style={{ fontSize: 12, color: MUTED, margin: "0 0 10px" }}>
                Do we have your permission to photograph or video {child.first_name} for church use?
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {(["granted", "denied"] as const).map((val) => {
                  const selected = child.photo_permission_status === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateChild(i, "photo_permission_status", val)}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        borderRadius: 10,
                        border: `2px solid ${selected ? (val === "granted" ? "#22c55e" : ERROR_COLOR) : BORDER}`,
                        background: selected ? (val === "granted" ? "#f0fdf4" : "#fef2f2") : CARD_BG,
                        color: selected ? (val === "granted" ? "#15803d" : "#b91c1c") : MUTED,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      {val === "granted" ? "✓ Grant Permission" : "✗ Deny Permission"}
                    </button>
                  );
                })}
              </div>
              {errors[`photo_${i}`] && (
                <p style={{ fontSize: 12, color: ERROR_COLOR, margin: "6px 0 0" }}>
                  {errors[`photo_${i}`]}
                </p>
              )}
            </div>
          </div>,
        )
      ))}

      {/* Section 3: Confirmation */}
      {card(
        <>
          <SectionHeader title="Confirm & Submit" />

          {/* Confirmation checkbox */}
          <div
            style={{
              background: "#f5f3ff",
              border: `1px solid ${errors["confirm"] ? ERROR_COLOR : "#c4b5fd"}`,
              borderRadius: 10,
              padding: "16px 18px",
              marginBottom: 20,
              cursor: "pointer",
            }}
            onClick={() =>
              page.phase === "form" &&
              setPage({
                ...page,
                data: { ...page.data, confirmationAccepted: !data.confirmationAccepted },
              })
            }
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${data.confirmationAccepted ? PURPLE : "#a78bfa"}`,
                  background: data.confirmationAccepted ? PURPLE : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {data.confirmationAccepted && (
                  <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: "#4c1d95", margin: 0, lineHeight: 1.5 }}>
                I have reviewed our family&rsquo;s information and confirm that it is accurate to the best of my knowledge.
              </p>
            </div>
            {errors["confirm"] && (
              <p style={{ fontSize: 12, color: ERROR_COLOR, margin: "8px 0 0 32px" }}>
                {errors["confirm"]}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {inp("Your Name", data.submittedName, (v) =>
              page.phase === "form" &&
              setPage({ ...page, data: { ...page.data, submittedName: v } }),
              { required: true, error: errors["name"] },
            )}
            {inp("Your Email", data.submittedEmail, (v) =>
              page.phase === "form" &&
              setPage({ ...page, data: { ...page.data, submittedEmail: v } }),
              { type: "email", required: true, error: errors["email"] },
            )}
          </div>

          {submitError && (
            <div
              style={{
                background: "#fef2f2",
                border: `1px solid #fecaca`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, color: ERROR_COLOR, margin: 0 }}>{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={page.phase === "submitting"}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 10,
              border: "none",
              background: page.phase === "submitting" ? "#a78bfa" : PURPLE,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: page.phase === "submitting" ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {page.phase === "submitting" ? "Submitting…" : "Submit Family Review"}
          </button>

          <p style={{ fontSize: 11, color: MUTED, textAlign: "center", margin: "12px 0 0" }}>
            If a child is missing from this form, please contact your church directly.
          </p>
        </>,
      )}
    </>,
  );
}
