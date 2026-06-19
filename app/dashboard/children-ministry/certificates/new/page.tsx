"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import CertificateCanvas from "@/components/certificates-v3/CertificateCanvas";
import CertificateExportButtons from "@/components/certificates-v3/CertificateExportButtons";
import type { CertificateData, CertTemplate, CertTranslation } from "@/components/certificates-v3/types";

const CERT_TYPES = [
  { value: "birthday",         label: "Birthday" },
  { value: "spiritual_birthday", label: "Spiritual Birthday" },
  { value: "baptism",          label: "Baptism" },
  { value: "faith_milestone",  label: "Faith Milestone" },
  { value: "scripture_memory", label: "Scripture Memory" },
  { value: "attendance",       label: "Attendance" },
  { value: "promotion",        label: "Promotion Sunday" },
  { value: "servant_heart",    label: "Servant Heart Award" },
  { value: "kindness",         label: "Kindness Award" },
  { value: "helper",           label: "Helper Award" },
];

const today = new Date().toLocaleDateString("en-US", {
  month: "long", day: "numeric", year: "numeric",
});

const DEFAULTS: CertificateData = {
  certType: "birthday",
  template: "purple",
  childName: "Child's Name",
  churchName: "",
  date: today,
  verse: "",
  reference: "",
  translation: "kjv",
  blessing: "",
};

const GOLD   = "#D4AF37";
const MUTED  = "#A9A9B8";
const BORDER = "rgba(212,175,55,0.18)";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "10px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>
      {children}
    </p>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-dark"
      style={{ width: "100%", padding: "8px 10px", background: "#0A0814", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", color: "#fff", outline: "none", boxSizing: "border-box" }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-dark"
      style={{ width: "100%", padding: "8px 10px", background: "#0A0814", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", color: "#fff", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function CertificateCreatorPage() {
  const certRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CertificateData>(DEFAULTS);

  function set<K extends keyof CertificateData>(key: K, value: CertificateData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  const filename = (data.childName || "certificate")
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase() + "-certificate";

  return (
    <AppShell navItems={[]}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#08060D" }}>

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <div style={{ width: "360px", flexShrink: 0, overflowY: "auto", borderRight: `1px solid ${BORDER}`, background: "#0A0814" }}>

          {/* Header */}
          <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>ShepherdKids</p>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif", margin: 0 }}>Certificate Creator</h1>
          </div>

          {/* Form fields */}
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Certificate type */}
            <Field label="Certificate Type">
              <select
                value={data.certType}
                onChange={e => set("certType", e.target.value)}
                className="select-dark"
                style={{ width: "100%", padding: "8px 10px", background: "#0A0814", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", color: "#fff", outline: "none", cursor: "pointer" }}
              >
                {CERT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            {/* Template */}
            <Field label="Template">
              <div style={{ display: "flex", gap: "8px" }}>
                {(["purple", "white"] as CertTemplate[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("template", t)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${data.template === t ? GOLD : BORDER}`,
                      background: data.template === t ? "rgba(212,175,55,0.1)" : "transparent",
                      color: data.template === t ? GOLD : MUTED,
                    }}
                  >
                    {t === "purple" ? "Royal Purple" : "Classic Ivory"}
                  </button>
                ))}
              </div>
            </Field>

            {/* Child name */}
            <Field label="Child's Name">
              <TextInput value={data.childName} onChange={v => set("childName", v)} placeholder="e.g. Emma Johnson" />
            </Field>

            {/* Church name */}
            <Field label="Church Name">
              <TextInput value={data.churchName ?? ""} onChange={v => set("churchName", v)} placeholder="e.g. Grace Community Church" />
            </Field>

            {/* Date */}
            <Field label="Date">
              <TextInput value={data.date ?? ""} onChange={v => set("date", v)} placeholder="e.g. June 18, 2026" />
            </Field>

            <div style={{ height: 1, background: BORDER }} />

            {/* Verse */}
            <Field label="Scripture Verse">
              <TextArea
                value={data.verse ?? ""}
                onChange={v => set("verse", v)}
                placeholder="Optional — not shown on current layout"
                rows={3}
              />
            </Field>

            {/* Reference */}
            <Field label="Reference">
              <TextInput value={data.reference ?? ""} onChange={v => set("reference", v)} placeholder="e.g. Psalm 139:13–14" />
            </Field>

            {/* Translation */}
            <Field label="Translation">
              <div style={{ display: "flex", gap: "8px" }}>
                {(["kjv", "niv"] as CertTranslation[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("translation", t)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${data.translation === t ? GOLD : BORDER}`,
                      background: data.translation === t ? "rgba(212,175,55,0.1)" : "transparent",
                      color: data.translation === t ? GOLD : MUTED,
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ height: 1, background: BORDER }} />

            {/* Blessing */}
            <Field label="Custom Blessing (optional)">
              <TextArea
                value={data.blessing ?? ""}
                onChange={v => set("blessing", v)}
                placeholder="Leave blank to use the default blessing for this certificate type"
                rows={3}
              />
            </Field>

          </div>
        </div>

        {/* ── Right: Live preview ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px", background: "#08060D" }}>
          <div ref={certRef}>
            <CertificateCanvas data={data} />
          </div>
          <CertificateExportButtons certRef={certRef} filename={filename} />
        </div>

      </div>
    </AppShell>
  );
}
