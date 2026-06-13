"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { type CertificateRecord, STATUS_LABEL, STATUS_COLOR } from "@/lib/certificates/types";

const GOLD  = "#D4AF37";
const MUTED = "#A9A9B8";
const BODY  = "#D8D8E8";
const CARD  = "#120A1F";

const CERT_TYPE_LABEL: Record<string, string> = {
  birthday:          "Birthday Celebration",
  spiritual_birthday:"Spiritual Birthday",
  baptism:           "Baptism Celebration",
  faith_milestone:   "Faith Milestone",
  scripture_memory:  "Scripture Memory Award",
  promotion:         "Promotion Sunday",
  servant_heart:     "Servant Heart Award",
  kindness:          "Kindness Award",
  helper:            "Helper Award",
  attendance:        "Attendance Award",
};

const CERT_TYPE_ICON: Record<string, string> = {
  birthday: "🎈", spiritual_birthday: "✝️", baptism: "💧",
  faith_milestone: "👑", scripture_memory: "📖", promotion: "🎓",
  servant_heart: "❤️", kindness: "💛", helper: "⭐", attendance: "📅",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft",          label: "Draft" },
  { value: "ready_to_print", label: "Ready to Print" },
  { value: "printed",        label: "Printed" },
  { value: "presented",      label: "Presented" },
  { value: "email_scheduled",label: "Email Scheduled" },
  { value: "email_sent",     label: "Email Sent" },
  { value: "archived",       label: "Archived" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: CertificateRecord["status"] }) {
  const c = STATUS_COLOR[status];
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: "100px",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function CertificateVaultPage() {
  const router = useRouter();
  const [certs,  setCerts]  = useState<CertificateRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    const url = filter
      ? `/api/children-ministry/certificates?status=${filter}`
      : `/api/children-ministry/certificates`;
    setLoading(true);
    fetch(url, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setCerts(d.certificates ?? []); setError(null); })
      .catch(() => setError("Failed to load certificates."))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <AppShell navItems={[]}>
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "32px 32px 24px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
          <button
            onClick={() => router.push("/dashboard/children-ministry")}
            style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "13px", padding: 0, marginBottom: "14px" }}
          >
            ← Children's Ministry
          </button>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase", margin: "0 0 6px" }}>
                Certificates
              </p>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
                🏛️ Certificate Vault
              </h1>
              <p style={{ fontSize: "13px", color: MUTED, margin: "6px 0 0" }}>
                All certificates — draft through presented and archived.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/children-ministry/certificates/new")}
              style={{ padding: "10px 20px", background: `linear-gradient(135deg, #7B2CBF, #9D4EDD)`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", marginTop: "4px" }}
            >
              + New Certificate
            </button>
          </div>
        </div>

        <div style={{ padding: "28px 32px" }}>

          {/* ── Status filter tabs ────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.04em",
                  background: filter === f.value ? "rgba(212,175,55,0.18)" : "transparent",
                  color: filter === f.value ? GOLD : MUTED,
                  border: `1px solid ${filter === f.value ? "rgba(212,175,55,0.40)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Content ───────────────────────────────────────────────────── */}
          {loading && (
            <p style={{ color: MUTED, fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
              Loading certificates…
            </p>
          )}
          {error && (
            <p style={{ color: "#FF6B6B", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
              {error}
            </p>
          )}

          {!loading && !error && certs.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontSize: "36px", marginBottom: "12px" }}>🎓</p>
              <p style={{ color: BODY, fontSize: "15px", marginBottom: "6px" }}>No certificates yet</p>
              <p style={{ color: MUTED, fontSize: "13px", marginBottom: "20px" }}>
                Create your first certificate for a child.
              </p>
              <button
                onClick={() => router.push("/dashboard/children-ministry/certificates/new")}
                style={{ padding: "10px 24px", background: `linear-gradient(135deg, #7B2CBF, #9D4EDD)`, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                Create Certificate
              </button>
            </div>
          )}

          {!loading && !error && certs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {certs.map(cert => (
                <div
                  key={cert.id}
                  onClick={() => router.push(`/dashboard/children-ministry/certificates/${cert.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 18px", background: CARD, border: "1px solid rgba(212,175,55,0.14)",
                    borderRadius: "12px", cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.14)")}
                >
                  {/* Icon */}
                  <div style={{ fontSize: "24px", flexShrink: 0, width: "36px", textAlign: "center" }}>
                    {CERT_TYPE_ICON[cert.cert_type] ?? "🎓"}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                      {cert.child_name}
                    </p>
                    <p style={{ fontSize: "11px", color: MUTED, margin: 0 }}>
                      {CERT_TYPE_LABEL[cert.cert_type] ?? cert.cert_type}
                      {cert.presentation_date ? ` · ${fmtDate(cert.presentation_date + 'T00:00:00')}` : ""}
                      {cert.reprint_count > 0 ? ` · Reprinted ×${cert.reprint_count}` : ""}
                    </p>
                  </div>

                  {/* Template badge */}
                  <div style={{ fontSize: "10px", color: MUTED, flexShrink: 0 }}>
                    {cert.template === "purple" ? "👑 Royal Purple" : "📄 Classic Ivory"}
                  </div>

                  {/* Status */}
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={cert.status} />
                  </div>

                  {/* Created date */}
                  <div style={{ fontSize: "11px", color: "#4a4a65", flexShrink: 0 }}>
                    {fmtDate(cert.created_at)}
                  </div>

                  <span style={{ color: MUTED, fontSize: "18px", flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
