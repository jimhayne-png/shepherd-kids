"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CertificateCanvas from "@/components/certificates-v3/CertificateCanvas";
import CertificateExportButtons from "@/components/certificates-v3/CertificateExportButtons";
import type { CertTemplate } from "@/components/certificates-v3/types";
import {
  type CertificateRecord,
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_STEPS,
  stepIndex,
} from "@/lib/certificates/types";
import { captureCertificateForEmail } from "@/lib/certificates/exportCertificate";

const GOLD = "#D4AF37";
const MUTED = "#A9A9B8";
const BODY = "#D8D8E8";
const CARD = "#120A1F";
const PURPLE = "#7B2CBF";
const PURPLE2 = "#9D4EDD";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function normalizeTemplate(template: string | null | undefined): CertTemplate {
  if (template === "premium" || template === "classic" || template === "minimal") {
    return template;
  }

  if (template === "purple") return "premium";
  if (template === "white") return "classic";

  return "premium";
}

function getTemplateLabel(template: string | null | undefined): string {
  const normalized = normalizeTemplate(template);

  if (normalized === "premium") return "Premium Colors";
  if (normalized === "classic") return "Classic";
  return "Minimal";
}

function StatusBadge({ status }: { status: CertificateRecord["status"] }) {
  const c = STATUS_COLOR[status];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "100px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function StatusTimeline({ status }: { status: CertificateRecord["status"] }) {
  const current = stepIndex(status);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "18px 32px",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(212,175,55,0.08)",
      }}
    >
      {STATUS_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const c = STATUS_COLOR[step];

        return (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: active
                    ? c.bg
                    : done
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `2px solid ${
                    active
                      ? c.border
                      : done
                      ? "rgba(16,185,129,0.45)"
                      : "rgba(255,255,255,0.10)"
                  }`,
                  color: active ? c.text : done ? "#6EE7B7" : "#4a4a65",
                }}
              >
                {done ? "✓" : i + 1}
              </div>

              <span
                style={{
                  fontSize: "9px",
                  fontWeight: active ? 700 : 400,
                  color: active ? c.text : done ? "#6EE7B7" : "#4a4a65",
                  marginTop: "4px",
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  lineHeight: 1.2,
                  maxWidth: "64px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>

            {i < STATUS_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  marginBottom: "18px",
                  background: done
                    ? "rgba(16,185,129,0.35)"
                    : "rgba(255,255,255,0.07)",
                }}
              />
            )}
          </div>
        );
      })}

      {status === "archived" && (
        <div
          style={{
            marginLeft: "12px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "9px",
              fontWeight: 700,
              background: STATUS_COLOR.archived.bg,
              border: `2px solid ${STATUS_COLOR.archived.border}`,
              color: STATUS_COLOR.archived.text,
            }}
          >
            ✓
          </div>

          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: STATUS_COLOR.archived.text,
              marginTop: "4px",
            }}
          >
            Archived
          </span>
        </div>
      )}
    </div>
  );
}

function EmailWarningModal({
  onCancel,
  onForce,
  onMarkPresented,
}: {
  onCancel: () => void;
  onForce: () => void;
  onMarkPresented: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.80)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#150E22",
          border: "1px solid rgba(212,175,55,0.28)",
          borderRadius: "16px",
          padding: "28px 28px 24px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 8px 64px rgba(0,0,0,0.70)",
        }}
      >
        <div style={{ fontSize: "28px", textAlign: "center", marginBottom: "12px" }}>
          ⚠️
        </div>

        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 10px",
            textAlign: "center",
            fontFamily: "Georgia, serif",
          }}
        >
          Certificate Not Yet Presented
        </h3>

        <p
          style={{
            fontSize: "13px",
            color: MUTED,
            lineHeight: 1.6,
            margin: "0 0 22px",
            textAlign: "center",
          }}
        >
          This certificate is still marked as{" "}
          <strong style={{ color: BODY }}>Not Presented</strong>. Sending the PDF to
          parents now may spoil the planned presentation moment.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={onMarkPresented}
            style={{
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background:
                "linear-gradient(135deg, rgba(5,150,105,0.7), rgba(5,150,105,0.5))",
              color: "#6EE7B7",
              fontSize: "13px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            ✓ Mark as Presented First
          </button>

          <button
            onClick={onForce}
            style={{
              padding: "11px",
              borderRadius: "10px",
              border: "1px solid rgba(212,175,55,0.25)",
              cursor: "pointer",
              background: "rgba(212,175,55,0.07)",
              color: GOLD,
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Send Anyway
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              background: "transparent",
              color: MUTED,
              fontSize: "13px",
              fontWeight: 400,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SendConfirmModal({
  parentEmail,
  childName,
  certTypeLabel,
  force,
  onCancel,
  onConfirm,
}: {
  parentEmail: string;
  childName: string;
  certTypeLabel: string;
  force?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.80)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#150E22",
          border: "1px solid rgba(212,175,55,0.28)",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 8px 64px rgba(0,0,0,0.70)",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 14px",
            fontFamily: "Georgia, serif",
          }}
        >
          Email Certificate to Parent
        </h3>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "14px",
          }}
        >
          <p style={{ fontSize: "11px", color: MUTED, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Recipient
          </p>
          <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>{parentEmail}</p>
          {force && (
            <p style={{ fontSize: "11px", color: "#FCD34D", margin: "4px 0 0" }}>
              Bypassing Presented check
            </p>
          )}
          <p style={{ fontSize: "11px", color: MUTED, margin: "10px 0 3px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Certificate
          </p>
          <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>
            {childName} — {certTypeLabel}
          </p>
        </div>

        <p style={{ fontSize: "12px", color: MUTED, margin: "0 0 18px", lineHeight: 1.5 }}>
          The certificate PDF will be generated and attached to a personalized email delivered to the parent.
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Send Certificate
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: "11px 20px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              background: "transparent",
              color: MUTED,
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "11px 16px",
        borderRadius: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        border: primary
          ? "none"
          : danger
          ? "1px solid rgba(239,68,68,0.35)"
          : "1px solid rgba(212,175,55,0.22)",
        background: primary
          ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`
          : danger
          ? "rgba(239,68,68,0.08)"
          : "rgba(212,175,55,0.06)",
        color: primary ? "#fff" : danger ? "#FCA5A5" : BODY,
        fontSize: "13px",
        fontWeight: 700,
        textAlign: "left",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: MUTED,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      <span style={{ fontSize: "12px", color: BODY, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export default function CertificateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const certRef = useRef<HTMLDivElement>(null);

  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forceEmail, setForceEmail] = useState(false);
  const [sendingPhase, setSendingPhase] = useState<null | "generating" | "sending">(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, {
        credentials: "include",
      });

      const d = await r.json();

      if (!r.ok) {
        setError(d.error ?? "Failed to load certificate.");
        return;
      }

      setCert(d.certificate);
    } catch {
      setError("Failed to load certificate.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchStatus(status: CertificateRecord["status"]) {
    if (!cert) return;

    setSaving(true);
    setActionError(null);

    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const d = await r.json();

      if (!r.ok) {
        setActionError(d.error ?? "Action failed.");
        return;
      }

      setCert(d.certificate);
    } finally {
      setSaving(false);
    }
  }

  async function patchReprint() {
    if (!cert) return;

    setSaving(true);
    setActionError(null);

    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reprint: true }),
      });

      const d = await r.json();

      if (!r.ok) {
        setActionError(d.error ?? "Reprint failed.");
        return;
      }

      setCert(d.certificate);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendCertificate(force = false) {
    if (!cert || !certRef.current) return;

    setShowConfirm(false);
    setShowWarning(false);
    setActionError(null);
    setForceEmail(false);
    setSendSuccess(null);

    try {
      setSendingPhase("generating");
      const pdfData = await captureCertificateForEmail(certRef.current);

      setSendingPhase("sending");
      const filename = `${cert.child_name.replace(/\s+/g, "-").toLowerCase()}-certificate.pdf`;

      const r = await fetch(`/api/children-ministry/certificates/${id}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfData, filename, force }),
      });

      const d = await r.json();

      if (!r.ok) {
        setActionError(
          d.message ?? d.error ?? "The certificate could not be sent. No delivery status was recorded. Please try again."
        );
        return;
      }

      setSendSuccess(`Certificate sent successfully to ${cert.parent_email}.`);
      await load();
    } catch {
      setActionError("The certificate could not be sent. No delivery status was recorded. Please try again.");
    } finally {
      setSendingPhase(null);
    }
  }

  function handleEmailClick() {
    if (!cert) return;

    const canEmail = ["presented", "email_scheduled", "email_sent"].includes(cert.status);

    if (!canEmail) {
      setShowWarning(true);
      return;
    }

    setForceEmail(false);
    setShowConfirm(true);
  }

  if (loading) {
    return (
      <AppShell navItems={[]}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0814",
          }}
        >
          <p style={{ color: MUTED, fontSize: "13px" }}>
            Loading certificate…
          </p>
        </div>
      </AppShell>
    );
  }

  if (error || !cert) {
    return (
      <AppShell navItems={[]}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0814",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "#FF6B6B",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {error ?? "Certificate not found."}
            </p>

            <button
              onClick={() =>
                router.push("/dashboard/children-ministry/certificates")
              }
              style={{
                padding: "9px 20px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: MUTED,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ← Back to Certificate Vault
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasEmail = !!cert.parent_email;
  const isArchived = cert.status === "archived";

  const CERT_TYPE_LABEL: Record<string, string> = {
    birthday: "Birthday Celebration",
    spiritual_birthday: "Spiritual Birthday",
    baptism: "Baptism Celebration",
    faith_milestone: "Faith Milestone",
    scripture_memory: "Scripture Memory Award",
    promotion: "Promotion Sunday",
    servant_heart: "Servant Heart Award",
    kindness: "Kindness Award",
    helper: "Helper Award",
    attendance: "Attendance Award",
  };

  const normalizedTemplate = normalizeTemplate(cert.template);

  return (
    <AppShell navItems={[]}>
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div
          style={{
            padding: "28px 32px 20px",
            background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)",
            borderBottom: "1px solid rgba(212,175,55,0.15)",
          }}
        >
          <button
            onClick={() =>
              router.push("/dashboard/children-ministry/certificates")
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: MUTED,
              fontSize: "13px",
              padding: 0,
              marginBottom: "12px",
            }}
          >
            ← Certificate Vault
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: GOLD,
                  textTransform: "uppercase",
                  margin: "0 0 5px",
                }}
              >
                {CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type}
              </p>

              <h1
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 6px",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {cert.child_name}
              </h1>

              <StatusBadge status={cert.status} />
            </div>

            {cert.reprint_count > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  color: MUTED,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "100px",
                  padding: "4px 12px",
                }}
              >
                Reprinted ×{cert.reprint_count}
              </span>
            )}
          </div>
        </div>

        <StatusTimeline status={cert.status} />

        <div
          style={{
            padding: "28px 32px",
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: "28px",
            alignItems: "start",
          }}
        >
          <div>
            <div ref={certRef}>
              <CertificateCanvas
                data={{
                  certType: cert.cert_type,
                  template: normalizedTemplate,
                  childName: cert.child_name,
                  churchName: cert.church_name ?? undefined,
                  verse: cert.verse ?? undefined,
                  reference: cert.reference ?? undefined,
                  translation: cert.translation,
                  blessing: cert.blessing ?? undefined,
                  ministerName: cert.minister_name ?? undefined,
                  ministerTitle: cert.minister_title ?? undefined,
                  date: cert.presentation_date ?? undefined,
                }}
              />
            </div>

            <CertificateExportButtons
              certRef={certRef}
              filename={`${cert.child_name
                .replace(/\s+/g, "-")
                .toLowerCase()}-certificate`}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {actionError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.30)",
                  borderRadius: "10px",
                }}
              >
                <p style={{ color: "#FCA5A5", fontSize: "12px", margin: 0 }}>
                  {actionError}
                </p>
              </div>
            )}

            {sendSuccess && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.30)",
                  borderRadius: "10px",
                }}
              >
                <p style={{ color: "#34D399", fontSize: "12px", margin: 0, fontWeight: 700 }}>
                  ✓ {sendSuccess}
                </p>
              </div>
            )}

            {sendingPhase && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(123,44,191,0.10)",
                  border: "1px solid rgba(123,44,191,0.30)",
                  borderRadius: "10px",
                }}
              >
                <p style={{ color: "#C084FC", fontSize: "12px", margin: 0 }}>
                  {sendingPhase === "generating" ? "Generating certificate PDF…" : "Sending email…"}
                </p>
              </div>
            )}

            <div
              style={{
                background: CARD,
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(212,175,55,0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: GOLD,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    margin: 0,
                  }}
                >
                  Workflow Actions
                </p>
              </div>

              <div
                style={{
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {cert.status === "draft" && (
                  <ActionButton
                    label="✓ Mark Ready to Print"
                    onClick={() => patchStatus("ready_to_print")}
                    primary
                    disabled={saving}
                  />
                )}

                {cert.status === "ready_to_print" && (
                  <ActionButton
                    label="🖨️ Mark Printed"
                    onClick={() => patchStatus("printed")}
                    primary
                    disabled={saving}
                  />
                )}

                {cert.status === "printed" && (
                  <ActionButton
                    label="🎓 Mark as Presented"
                    onClick={() => patchStatus("presented")}
                    primary
                    disabled={saving}
                  />
                )}

                {(cert.status === "presented" ||
                  cert.status === "email_scheduled") && (
                  <>
                    <ActionButton
                      label="📧 Email Certificate to Parent"
                      onClick={handleEmailClick}
                      primary={!hasEmail}
                      disabled={saving || sendingPhase !== null || !hasEmail}
                    />

                    {!hasEmail && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#FCD34D",
                          margin: 0,
                          padding: "0 2px",
                        }}
                      >
                        No parent email on this certificate — edit the certificate
                        to add one.
                      </p>
                    )}
                  </>
                )}

                {cert.status === "email_sent" && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.22)",
                      borderRadius: "10px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#34D399",
                        margin: 0,
                        fontWeight: 700,
                      }}
                    >
                      ✓ Email sent to parent
                    </p>

                    {cert.parent_email_sent_at && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: MUTED,
                          margin: "3px 0 0",
                        }}
                      >
                        {fmtDate(cert.parent_email_sent_at)}
                      </p>
                    )}
                  </div>
                )}

                {![
                  "presented",
                  "email_scheduled",
                  "email_sent",
                  "archived",
                ].includes(cert.status) && (
                  <ActionButton
                    label="📧 Email Certificate to Parent"
                    onClick={handleEmailClick}
                    disabled={saving || sendingPhase !== null || !hasEmail}
                  />
                )}

                {!isArchived && (
                  <ActionButton
                    label="Archive Certificate"
                    onClick={() => patchStatus("archived")}
                    danger
                    disabled={saving}
                  />
                )}

                <ActionButton
                  label={`Reprint${
                    cert.reprint_count > 0 ? ` (×${cert.reprint_count})` : ""
                  }`}
                  onClick={patchReprint}
                  disabled={saving}
                />
              </div>
            </div>

            <div
              style={{
                background: CARD,
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(212,175,55,0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: GOLD,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    margin: 0,
                  }}
                >
                  Certificate Details
                </p>
              </div>

              <div style={{ padding: "4px 16px 12px" }}>
                <MetaRow
                  label="Type"
                  value={CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type}
                />
                <MetaRow label="Template" value={getTemplateLabel(cert.template)} />
                <MetaRow
                  label="Translation"
                  value={cert.translation.toUpperCase()}
                />
                <MetaRow
                  label="Presentation"
                  value={fmtDate(
                    cert.presentation_date
                      ? cert.presentation_date + "T00:00:00"
                      : null
                  )}
                />

                {cert.parent_email && (
                  <MetaRow label="Parent Email" value={cert.parent_email} />
                )}

                {cert.email_scheduled_for && (
                  <MetaRow
                    label="Email Scheduled"
                    value={fmtDate(cert.email_scheduled_for)}
                  />
                )}

                <MetaRow label="Created" value={fmtDate(cert.created_at)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showWarning && (
        <EmailWarningModal
          onCancel={() => setShowWarning(false)}
          onForce={() => {
            setShowWarning(false);
            setForceEmail(true);
            setShowConfirm(true);
          }}
          onMarkPresented={async () => {
            setShowWarning(false);
            await patchStatus("presented");
            setForceEmail(false);
            setShowConfirm(true);
          }}
        />
      )}

      {showConfirm && cert?.parent_email && (
        <SendConfirmModal
          parentEmail={cert.parent_email}
          childName={cert.child_name}
          certTypeLabel={CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type}
          force={forceEmail}
          onCancel={() => {
            setShowConfirm(false);
            setForceEmail(false);
          }}
          onConfirm={() => handleSendCertificate(forceEmail)}
        />
      )}
    </AppShell>
  );
}