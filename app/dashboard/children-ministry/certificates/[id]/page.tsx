"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CertificateCanvas from "@/components/certificates-v3/CertificateCanvas";
import CertificateExportButtons from "@/components/certificates-v3/CertificateExportButtons";
import {
  type CertificateRecord,
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_STEPS,
  stepIndex,
} from "@/lib/certificates/types";

// ── palette ────────────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const MUTED  = "#A9A9B8";
const BODY   = "#D8D8E8";
const CARD   = "#120A1F";
const PURPLE = "#7B2CBF";
const PURPLE2= "#9D4EDD";

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function getScheduleISO(option: string): string {
  const now = new Date();
  if (option === "tonight") {
    const t = new Date(now); t.setHours(19, 0, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t.toISOString();
  }
  if (option === "tomorrow-morning") {
    const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(8, 0, 0, 0);
    return t.toISOString();
  }
  if (option === "sunday-evening") {
    const t = new Date(now);
    const day = t.getDay();
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    t.setDate(t.getDate() + daysUntilSunday); t.setHours(18, 0, 0, 0);
    return t.toISOString();
  }
  return now.toISOString();
}

function fmtScheduleLabel(option: string): string {
  const iso = getScheduleISO(option);
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CertificateRecord["status"] }) {
  const c = STATUS_COLOR[status];
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: "100px",
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── StatusTimeline ─────────────────────────────────────────────────────────────
function StatusTimeline({ status }: { status: CertificateRecord["status"] }) {
  const current = stepIndex(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "18px 32px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
      {STATUS_STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const future  = i > current;
        const c       = STATUS_COLOR[step];
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            {/* Node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: "26px", height: "26px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                background: active ? c.bg : done ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${active ? c.border : done ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.10)"}`,
                color: active ? c.text : done ? "#6EE7B7" : "#4a4a65",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "9px", fontWeight: active ? 700 : 400,
                color: active ? c.text : done ? "#6EE7B7" : "#4a4a65",
                marginTop: "4px", letterSpacing: "0.04em", textAlign: "center",
                lineHeight: 1.2, maxWidth: "64px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {STATUS_LABEL[step]}
              </span>
            </div>
            {/* Connector */}
            {i < STATUS_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: "2px", marginBottom: "18px",
                background: done ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.07)",
              }} />
            )}
          </div>
        );
      })}
      {/* Archived node (off to the side) */}
      {status === "archived" && (
        <div style={{ marginLeft: "12px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: "26px", height: "26px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "9px", fontWeight: 700,
            background: STATUS_COLOR.archived.bg, border: `2px solid ${STATUS_COLOR.archived.border}`,
            color: STATUS_COLOR.archived.text,
          }}>✓</div>
          <span style={{ fontSize: "9px", fontWeight: 700, color: STATUS_COLOR.archived.text, marginTop: "4px" }}>
            Archived
          </span>
        </div>
      )}
    </div>
  );
}

// ── EmailWarningModal ──────────────────────────────────────────────────────────
function EmailWarningModal({
  onCancel, onForce, onMarkPresented,
}: {
  onCancel:        () => void;
  onForce:         () => void;
  onMarkPresented: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.80)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{
        background: "#150E22", border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: "16px", padding: "28px 28px 24px", maxWidth: "420px", width: "100%",
        boxShadow: "0 8px 64px rgba(0,0,0,0.70)",
      }}>
        <div style={{ fontSize: "28px", textAlign: "center", marginBottom: "12px" }}>⚠️</div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: "0 0 10px", textAlign: "center", fontFamily: "Georgia, serif" }}>
          Certificate Not Yet Presented
        </h3>
        <p style={{ fontSize: "13px", color: MUTED, lineHeight: 1.6, margin: "0 0 22px", textAlign: "center" }}>
          This certificate is still marked as <strong style={{ color: BODY }}>Not Presented</strong>.
          Sending the PDF to parents now may spoil the planned presentation moment.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={onMarkPresented}
            style={{ padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, rgba(5,150,105,0.7), rgba(5,150,105,0.5))`, color: "#6EE7B7", fontSize: "13px", fontWeight: 700, textAlign: "center" }}
          >
            ✓ Mark as Presented First
          </button>
          <button
            onClick={onForce}
            style={{ padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.25)", cursor: "pointer", background: "rgba(212,175,55,0.07)", color: GOLD, fontSize: "13px", fontWeight: 700 }}
          >
            Send Anyway
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "transparent", color: MUTED, fontSize: "13px", fontWeight: 400 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EmailScheduleModal ─────────────────────────────────────────────────────────
const SCHEDULE_OPTIONS = [
  { id: "now",              label: "Send Immediately",     detail: "Email will be sent right now" },
  { id: "tonight",          label: "Tonight at 7:00 PM",  detail: () => fmtScheduleLabel("tonight") },
  { id: "tomorrow-morning", label: "Tomorrow Morning",    detail: () => fmtScheduleLabel("tomorrow-morning") },
  { id: "sunday-evening",   label: "Sunday Evening",      detail: () => fmtScheduleLabel("sunday-evening") },
  { id: "custom",           label: "Custom Date & Time",  detail: "Pick a specific date and time" },
] as const;

type ScheduleOptionId = typeof SCHEDULE_OPTIONS[number]["id"];

function EmailScheduleModal({
  parentEmail, force, onCancel, onConfirm,
}: {
  parentEmail: string;
  force?: boolean;
  onCancel:  () => void;
  onConfirm: (sendNow: boolean, scheduledFor: string | null) => void;
}) {
  const [selected, setSelected] = useState<ScheduleOptionId>("now");
  const [customDt, setCustomDt] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  function handleConfirm() {
    if (selected === "now") { onConfirm(true, null); return; }
    if (selected === "custom") { onConfirm(false, new Date(customDt).toISOString()); return; }
    onConfirm(false, getScheduleISO(selected));
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.80)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{
        background: "#150E22", border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: "16px", padding: "28px", maxWidth: "440px", width: "100%",
        boxShadow: "0 8px 64px rgba(0,0,0,0.70)",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
          Email Certificate to Parent
        </h3>
        <p style={{ fontSize: "12px", color: MUTED, margin: "0 0 18px" }}>
          Sending to: <strong style={{ color: BODY }}>{parentEmail}</strong>
          {force && <span style={{ color: "#FCD34D", marginLeft: "8px" }}>(bypassing Presented check)</span>}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px" }}>
          {SCHEDULE_OPTIONS.map(opt => {
            const detail = typeof opt.detail === "function" ? opt.detail() : opt.detail;
            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                  border: `1.5px solid ${selected === opt.id ? "rgba(212,175,55,0.50)" : "rgba(255,255,255,0.08)"}`,
                  background: selected === opt.id ? "rgba(212,175,55,0.09)" : "transparent",
                }}
              >
                <div style={{
                  width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${selected === opt.id ? GOLD : "rgba(255,255,255,0.25)"}`,
                  background: selected === opt.id ? GOLD : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected === opt.id && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#120A1F" }} />}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: selected === opt.id ? "#ffffff" : BODY, margin: 0 }}>{opt.label}</p>
                  <p style={{ fontSize: "11px", color: MUTED, margin: 0 }}>{detail}</p>
                </div>
              </button>
            );
          })}
        </div>
        {selected === "custom" && (
          <div style={{ marginBottom: "18px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
              Date &amp; Time
            </p>
            <input
              type="datetime-local"
              value={customDt}
              onChange={e => setCustomDt(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleConfirm}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`, color: "#fff", fontSize: "13px", fontWeight: 700 }}
          >
            {selected === "now" ? "Send Now" : "Schedule Email"}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "11px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "transparent", color: MUTED, fontSize: "13px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ActionButton ───────────────────────────────────────────────────────────────
function ActionButton({ label, onClick, primary, danger, disabled }: {
  label: string; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "11px 16px", borderRadius: "10px", cursor: disabled ? "not-allowed" : "pointer",
        border: primary ? "none" : danger ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(212,175,55,0.22)",
        background: primary
          ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`
          : danger
          ? "rgba(239,68,68,0.08)"
          : "rgba(212,175,55,0.06)",
        color: primary ? "#fff" : danger ? "#FCA5A5" : BODY,
        fontSize: "13px", fontWeight: 700, textAlign: "left" as const,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── CertMetaRow ────────────────────────────────────────────────────────────────
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "12px", color: BODY, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CertificateDetailPage() {
  const router  = useRouter();
  const params  = useParams<{ id: string }>();
  const id      = params.id;
  const certRef = useRef<HTMLDivElement>(null);

  const [cert,     setCert]     = useState<CertificateRecord | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // modal state
  const [showWarning,  setShowWarning]  = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [forceEmail,   setForceEmail]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Failed to load certificate."); return; }
      setCert(d.certificate);
    } catch {
      setError("Failed to load certificate.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patchStatus(status: CertificateRecord["status"]) {
    if (!cert) return;
    setSaving(true); setActionError(null);
    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) { setActionError(d.error ?? "Action failed."); return; }
      setCert(d.certificate);
    } finally {
      setSaving(false);
    }
  }

  async function patchReprint() {
    if (!cert) return;
    setSaving(true); setActionError(null);
    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reprint: true }),
      });
      const d = await r.json();
      if (!r.ok) { setActionError(d.error ?? "Reprint failed."); return; }
      setCert(d.certificate);
    } finally {
      setSaving(false);
    }
  }

  async function sendEmail(sendNow: boolean, scheduleFor: string | null, force = false) {
    if (!cert) return;
    setSaving(true); setActionError(null);
    setShowSchedule(false); setShowWarning(false);
    try {
      const r = await fetch(`/api/children-ministry/certificates/${id}/email`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_now: sendNow, schedule_for: scheduleFor, force }),
      });
      const d = await r.json();
      if (!r.ok) { setActionError(d.message ?? d.error ?? "Email action failed."); return; }
      await load();
    } finally {
      setSaving(false);
    }
  }

  function handleEmailClick() {
    if (!cert) return;
    const canEmail = ["presented", "email_scheduled", "email_sent"].includes(cert.status);
    if (!canEmail) {
      setShowWarning(true);
    } else {
      setForceEmail(false);
      setShowSchedule(true);
    }
  }

  if (loading) {
    return (
      <AppShell navItems={[]}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0A0814" }}>
          <p style={{ color: MUTED, fontSize: "13px" }}>Loading certificate…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !cert) {
    return (
      <AppShell navItems={[]}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0A0814" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#FF6B6B", fontSize: "13px", marginBottom: "12px" }}>{error ?? "Certificate not found."}</p>
            <button
              onClick={() => router.push("/dashboard/children-ministry/certificates")}
              style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: MUTED, fontSize: "13px", cursor: "pointer" }}
            >
              ← Back to Certificate Vault
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasEmail       = !!cert.parent_email;
  const isArchived     = cert.status === "archived";
  const canEmail       = ["presented", "email_scheduled", "email_sent"].includes(cert.status);

  const CERT_TYPE_LABEL: Record<string, string> = {
    birthday: "Birthday Celebration", spiritual_birthday: "Spiritual Birthday",
    baptism: "Baptism Celebration", faith_milestone: "Faith Milestone",
    scripture_memory: "Scripture Memory Award", promotion: "Promotion Sunday",
    servant_heart: "Servant Heart Award", kindness: "Kindness Award",
    helper: "Helper Award", attendance: "Attendance Award",
  };

  return (
    <AppShell navItems={[]}>
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "28px 32px 20px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
          <button
            onClick={() => router.push("/dashboard/children-ministry/certificates")}
            style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "13px", padding: 0, marginBottom: "12px" }}
          >
            ← Certificate Vault
          </button>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase", margin: "0 0 5px" }}>
                {CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type}
              </p>
              <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                {cert.child_name}
              </h1>
              <StatusBadge status={cert.status} />
            </div>
            {cert.reprint_count > 0 && (
              <span style={{ fontSize: "11px", color: MUTED, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "100px", padding: "4px 12px" }}>
                Reprinted ×{cert.reprint_count}
              </span>
            )}
          </div>
        </div>

        {/* ── Status timeline ────────────────────────────────────────────── */}
        <StatusTimeline status={cert.status} />

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: "28px", alignItems: "start" }}>

          {/* ── Certificate preview ──────────────────────────────────────── */}
          <div>
            <div ref={certRef}>
              <CertificateCanvas data={{
                certType: cert.cert_type,
                template: cert.template,
                childName: cert.child_name,
                churchName: cert.church_name ?? undefined,
                churchTagline: cert.church_tagline ?? undefined,
                verse: cert.verse ?? undefined,
                reference: cert.reference ?? undefined,
                translation: cert.translation,
                blessing: cert.blessing ?? undefined,
                ministerName: cert.minister_name ?? undefined,
                ministerTitle: cert.minister_title ?? undefined,
                date: cert.presentation_date ?? undefined,
              }} />
            </div>
            <CertificateExportButtons
              certRef={certRef}
              filename={`${cert.child_name.replace(/\s+/g, "-").toLowerCase()}-certificate`}
            />
          </div>

          {/* ── Workflow panel ───────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Action error */}
            {actionError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: "10px" }}>
                <p style={{ color: "#FCA5A5", fontSize: "12px", margin: 0 }}>{actionError}</p>
              </div>
            )}

            {/* ── Status actions ────────────────────────────────────────── */}
            <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.18)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Workflow Actions</p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>

                {cert.status === "draft" && (
                  <ActionButton
                    label="✓ Mark Ready to Print"
                    onClick={() => patchStatus("ready_to_print")}
                    primary disabled={saving}
                  />
                )}
                {cert.status === "ready_to_print" && (
                  <ActionButton
                    label="🖨️ Mark Printed"
                    onClick={() => patchStatus("printed")}
                    primary disabled={saving}
                  />
                )}
                {cert.status === "printed" && (
                  <ActionButton
                    label="🎓 Mark as Presented"
                    onClick={() => patchStatus("presented")}
                    primary disabled={saving}
                  />
                )}
                {(cert.status === "presented" || cert.status === "email_scheduled") && (
                  <>
                    <ActionButton
                      label={cert.status === "email_scheduled" ? "📧 Reschedule or Send Email" : "📧 Schedule Parent Email"}
                      onClick={handleEmailClick}
                      primary={!hasEmail}
                      disabled={saving || !hasEmail}
                    />
                    {!hasEmail && (
                      <p style={{ fontSize: "11px", color: "#FCD34D", margin: 0, padding: "0 2px" }}>
                        No parent email on this certificate — edit the certificate to add one.
                      </p>
                    )}
                  </>
                )}
                {cert.status === "email_sent" && (
                  <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#34D399", margin: 0, fontWeight: 700 }}>
                      ✓ Email sent to parent
                    </p>
                    {cert.parent_email_sent_at && (
                      <p style={{ fontSize: "11px", color: MUTED, margin: "3px 0 0" }}>
                        {fmtDate(cert.parent_email_sent_at)}
                      </p>
                    )}
                  </div>
                )}

                {/* Email before Presented — show disabled button with hover to explain */}
                {!["presented","email_scheduled","email_sent","archived"].includes(cert.status) && (
                  <ActionButton
                    label="📧 Email Certificate to Parent"
                    onClick={handleEmailClick}
                    disabled={saving || !hasEmail}
                  />
                )}

                {/* Archive */}
                {!isArchived && (
                  <ActionButton
                    label="Archive Certificate"
                    onClick={() => patchStatus("archived")}
                    danger disabled={saving}
                  />
                )}

                {/* Reprint */}
                <ActionButton
                  label={`Reprint${cert.reprint_count > 0 ? ` (×${cert.reprint_count})` : ""}`}
                  onClick={patchReprint}
                  disabled={saving}
                />
              </div>
            </div>

            {/* ── Certificate details ───────────────────────────────────── */}
            <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.18)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Certificate Details</p>
              </div>
              <div style={{ padding: "4px 16px 12px" }}>
                <MetaRow label="Type"         value={CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type} />
                <MetaRow label="Template"     value={cert.template === "purple" ? "Royal Purple" : "Classic Ivory"} />
                <MetaRow label="Translation"  value={cert.translation.toUpperCase()} />
                <MetaRow label="Presentation" value={fmtDate(cert.presentation_date ? cert.presentation_date + "T00:00:00" : null)} />
                {cert.parent_email && (
                  <MetaRow label="Parent Email" value={cert.parent_email} />
                )}
                {cert.email_scheduled_for && (
                  <MetaRow label="Email Scheduled" value={fmtDate(cert.email_scheduled_for)} />
                )}
                <MetaRow label="Created"      value={fmtDate(cert.created_at)} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── EmailWarningModal ─────────────────────────────────────────────── */}
      {showWarning && (
        <EmailWarningModal
          onCancel={() => setShowWarning(false)}
          onForce={() => {
            setShowWarning(false);
            setForceEmail(true);
            setShowSchedule(true);
          }}
          onMarkPresented={async () => {
            setShowWarning(false);
            await patchStatus("presented");
            setForceEmail(false);
            setShowSchedule(true);
          }}
        />
      )}

      {/* ── EmailScheduleModal ────────────────────────────────────────────── */}
      {showSchedule && cert?.parent_email && (
        <EmailScheduleModal
          parentEmail={cert.parent_email}
          force={forceEmail}
          onCancel={() => { setShowSchedule(false); setForceEmail(false); }}
          onConfirm={(sendNow, scheduledFor) => sendEmail(sendNow, scheduledFor, forceEmail)}
        />
      )}
    </AppShell>
  );
}
