"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const ACCENT = "#7B2CBF";
const ACCENT2 = "#9D4EDD";
const GOLD = "#D4AF37";
const CARD = "#120A1F";
const MUTED = "#A9A9B8";
const BODY = "#D8D8E8";

type CertMeta = { label: string; icon: string; subtitle: string; body: string };

const CERT_TYPES: Record<string, CertMeta> = {
  birthday:           { label: "Birthday Celebration",   icon: "🎂", subtitle: "Celebrating Your Special Day",        body: "Is celebrating another wonderful year of God's blessings with the ShepherdKids family." },
  spiritual_birthday: { label: "Spiritual Birthday",     icon: "✝️", subtitle: "A New Life in Christ",               body: "Has made a life-changing decision to follow Jesus Christ and begin their walk of faith." },
  baptism:            { label: "Baptism Celebration",    icon: "💧", subtitle: "Following Christ in Baptism",        body: "Has been baptized in obedience to God's Word, publicly declaring faith in Jesus Christ." },
  faith_milestone:    { label: "Faith Milestone",        icon: "🌱", subtitle: "Faith Journey Achievement",          body: "Has reached a significant and celebrated milestone in their personal faith journey." },
  scripture_memory:   { label: "Scripture Memory Award", icon: "📖", subtitle: "Hiding God's Word in Your Heart",    body: "Has demonstrated excellence in memorizing and meditating on the Word of God." },
  promotion:          { label: "Promotion Sunday",       icon: "🎓", subtitle: "Moving Forward in Faith",            body: "Is being honored and promoted to the next level of growth in ShepherdKids." },
  servant_heart:      { label: "Servant Heart Award",    icon: "🏆", subtitle: "A Heart That Serves",               body: "Has exemplified the servant heart of Jesus through faithful and joyful service." },
  kindness:           { label: "Kindness Award",         icon: "❤️", subtitle: "Spreading God's Love",              body: "Has shown extraordinary kindness, compassion, and care for others in the Children's Ministry." },
  helper:             { label: "Helper Award",           icon: "⭐", subtitle: "Always Ready to Help",              body: "Has gone above and beyond to help, encourage, and serve in the Children's Ministry." },
  attendance:         { label: "Attendance Award",       icon: "📅", subtitle: "Faithful and Committed",            body: "Has demonstrated remarkable faithfulness, commitment, and consistency in attendance." },
};

function fmtCertDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box" as const,
};

function CertPreview({ childName, certType, churchName, leaderName, date, note, style: certStyle }: {
  childName: string; certType: string; churchName: string; leaderName: string;
  date: string; note: string; style: "color" | "bw";
}) {
  const meta          = CERT_TYPES[certType] ?? CERT_TYPES["baptism"];
  const displayDate   = date       ? fmtCertDate(date) : "—";
  const displayChild  = childName  || "Child's Name";
  const displayChurch = churchName || "Your Church";
  const displayLeader = leaderName || "Children's Minister";
  const isColor       = certStyle === "color";

  const borderColor   = isColor ? GOLD        : "#000000";
  const innerBorder   = isColor ? "rgba(212,175,55,0.35)" : "#666666";
  const bg            = isColor ? "linear-gradient(135deg, #08060D 0%, #0D0520 50%, #08060D 100%)" : "#ffffff";
  const titleColor    = isColor ? "#ffffff"   : "#000000";
  const bodyColor     = isColor ? BODY        : "#333333";
  const subColor      = isColor ? "rgba(212,175,55,0.85)" : "#555555";
  const labelColor    = isColor ? MUTED       : "#666666";
  const divColor      = isColor ? "rgba(212,175,55,0.3)" : "#cccccc";
  const ornamentColor = isColor ? "rgba(212,175,55,0.6)" : "#999999";
  const dateColor     = isColor ? "rgba(212,175,55,0.9)" : "#000000";
  const brandColor    = isColor ? GOLD        : "#000000";
  const brandSubColor = isColor ? "rgba(212,175,55,0.6)" : "#444444";
  const sigLineColor  = isColor ? "rgba(212,175,55,0.4)" : "#000000";
  const sigSubColor   = isColor ? "rgba(169,169,184,0.5)" : "#777777";
  const glow          = isColor ? { boxShadow: `0 0 40px rgba(123,44,191,0.4), 0 0 80px rgba(212,175,55,0.08)` } : {};

  return (
    <div style={{ position: "relative", background: bg, border: `3px solid ${borderColor}`, borderRadius: "6px", padding: "28px 36px", width: "100%", boxSizing: "border-box", ...glow }}>
      {/* Inner border frame */}
      <div style={{ position: "absolute", inset: "8px", border: `1px solid ${innerBorder}`, borderRadius: "3px", pointerEvents: "none" }} />
      {/* Corner brackets */}
      <div style={{ position: "absolute", top: "14px",    left: "14px",  width: "18px", height: "18px", borderTop:    `2px solid ${borderColor}`, borderLeft:  `2px solid ${borderColor}` }} />
      <div style={{ position: "absolute", top: "14px",    right: "14px", width: "18px", height: "18px", borderTop:    `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}` }} />
      <div style={{ position: "absolute", bottom: "14px", left: "14px",  width: "18px", height: "18px", borderBottom: `2px solid ${borderColor}`, borderLeft:  `2px solid ${borderColor}` }} />
      <div style={{ position: "absolute", bottom: "14px", right: "14px", width: "18px", height: "18px", borderBottom: `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}` }} />

      <div style={{ position: "relative", textAlign: "center" }}>
        {/* Branding */}
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: brandColor, textTransform: "uppercase", margin: "0 0 3px" }}>ShepherdKids</p>
        <p style={{ fontSize: "9px", letterSpacing: "0.12em", color: brandSubColor, textTransform: "uppercase", margin: "0 0 14px" }}>{displayChurch}</p>

        {/* Top divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 14px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${divColor})` }} />
          <span style={{ fontSize: "12px", color: ornamentColor }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${divColor})` }} />
        </div>

        {/* Icon */}
        <div style={{ fontSize: "40px", marginBottom: "10px", lineHeight: 1, filter: isColor ? "none" : "grayscale(1)" }}>{meta.icon}</div>

        {/* Title */}
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", color: subColor, textTransform: "uppercase", margin: "0 0 5px" }}>Certificate of</p>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: titleColor, margin: "0 0 4px", fontFamily: "Georgia, serif", lineHeight: 1.2 }}>{meta.label}</h2>
        <p style={{ fontSize: "11px", color: subColor, margin: "0 0 14px", fontStyle: "italic" }}>{meta.subtitle}</p>

        {/* Mid divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 12px" }}>
          <div style={{ flex: 1, height: "1px", background: divColor }} />
          <span style={{ fontSize: "9px", color: ornamentColor, letterSpacing: "0.15em" }}>✦ ✦ ✦</span>
          <div style={{ flex: 1, height: "1px", background: divColor }} />
        </div>

        {/* Recipient */}
        <p style={{ fontSize: "9px", letterSpacing: "0.12em", color: labelColor, textTransform: "uppercase", margin: "0 0 5px" }}>This Certificate is Presented to</p>
        <h1 style={{ fontSize: "26px", fontWeight: 900, color: titleColor, margin: "0 0 10px", fontFamily: "Georgia, serif", lineHeight: 1.1 }}>{displayChild}</h1>

        {/* Body */}
        <p style={{ fontSize: "11px", color: bodyColor, margin: "0 0 14px", lineHeight: 1.7, maxWidth: "380px", marginLeft: "auto", marginRight: "auto", fontStyle: "italic" }}>{meta.body}</p>

        {/* Bottom divider */}
        <div style={{ height: "1px", background: divColor, margin: "0 0 10px" }} />

        {/* Date */}
        <p style={{ fontSize: "11px", fontWeight: 600, color: dateColor, margin: "0 0 12px", letterSpacing: "0.06em" }}>{displayDate}</p>

        {/* Note */}
        {note && <p style={{ fontSize: "10px", color: subColor, margin: "0 0 12px", fontStyle: "italic", lineHeight: 1.5 }}>"{note}"</p>}

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "130px", height: "1px", background: sigLineColor, margin: "0 auto 4px" }} />
            <p style={{ fontSize: "10px", color: isColor ? MUTED : "#333333", margin: 0 }}>{displayLeader}</p>
            <p style={{ fontSize: "9px", color: sigSubColor, margin: "2px 0 0" }}>Children's Ministry Leader</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateCreatorInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const childIdParam   = searchParams.get("childId")   ?? "";
  const childNameParam = searchParams.get("childName") ?? "";
  const typeParam      = searchParams.get("type")      ?? "baptism";

  const [childName,  setChildName]  = useState(childNameParam);
  const [certType,   setCertType]   = useState(Object.hasOwn(CERT_TYPES, typeParam) ? typeParam : "baptism");
  const [churchName, setChurchName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [note,       setNote]       = useState("");
  const [style,      setStyle]      = useState<"color" | "bw">("color");

  const backHref = childIdParam
    ? `/dashboard/children-ministry/children/${childIdParam}#celebration-timeline`
    : "/dashboard/children-ministry/children";

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
        <button
          onClick={() => router.push(backHref)}
          style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "13px", padding: 0, marginBottom: "14px", display: "flex", alignItems: "center", gap: "5px" }}
        >
          ← Back
        </button>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase", margin: "0 0 6px" }}>
          ShepherdKids · Certificates
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
          🎓 Certificate Creator
        </h1>
        <p style={{ fontSize: "13px", color: MUTED, margin: "6px 0 0" }}>
          Create a beautiful certificate to celebrate a child's milestone.
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px", display: "grid", gridTemplateColumns: "380px 1fr", gap: "32px", alignItems: "start" }}>

        {/* ── Form panel ─────────────────────────────────────────────── */}
        <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden", position: "sticky", top: "24px" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>📝</span>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>Certificate Details</h2>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Child Name */}
            <div>
              <FieldLabel>Child Name</FieldLabel>
              <input
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="Enter child's name"
                style={inputStyle}
              />
            </div>

            {/* Certificate Type */}
            <div>
              <FieldLabel>Certificate Type</FieldLabel>
              <select
                value={certType}
                onChange={e => setCertType(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {Object.entries(CERT_TYPES).map(([key, ct]) => (
                  <option key={key} value={key} style={{ background: "#120A1F" }}>
                    {ct.icon} {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Church Name */}
            <div>
              <FieldLabel>Church Name</FieldLabel>
              <input
                type="text"
                value={churchName}
                onChange={e => setChurchName(e.target.value)}
                placeholder="Your church name"
                style={inputStyle}
              />
            </div>

            {/* Leader / Minister */}
            <div>
              <FieldLabel>Leader / Children&apos;s Minister</FieldLabel>
              <input
                type="text"
                value={leaderName}
                onChange={e => setLeaderName(e.target.value)}
                placeholder="Name of presenting leader"
                style={inputStyle}
              />
            </div>

            {/* Date */}
            <div>
              <FieldLabel>Date</FieldLabel>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" as never }}
              />
            </div>

            {/* Note */}
            <div>
              <FieldLabel>Optional Note</FieldLabel>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="A personal note or scripture verse…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Template Style */}
            <div>
              <FieldLabel>Template Style</FieldLabel>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setStyle("color")}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: "10px",
                    border: `2px solid ${style === "color" ? ACCENT : "rgba(212,175,55,0.2)"}`,
                    background: style === "color" ? "rgba(123,44,191,0.2)" : "transparent",
                    color: style === "color" ? "#ffffff" : MUTED,
                    cursor: "pointer", fontSize: "12px", fontWeight: 700,
                  }}
                >
                  🎨 Full Color
                </button>
                <button
                  onClick={() => setStyle("bw")}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: "10px",
                    border: `2px solid ${style === "bw" ? ACCENT : "rgba(212,175,55,0.2)"}`,
                    background: style === "bw" ? "rgba(123,44,191,0.2)" : "transparent",
                    color: style === "bw" ? "#ffffff" : MUTED,
                    cursor: "pointer", fontSize: "12px", fontWeight: 700,
                  }}
                >
                  🖨️ Black & White
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Preview panel ───────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Live Preview — {style === "color" ? "Full Color" : "Black & White"}
          </p>

          <CertPreview
            childName={childName}
            certType={certType}
            churchName={churchName}
            leaderName={leaderName}
            date={date}
            note={note}
            style={style}
          />

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: "#ffffff", fontSize: "13px", fontWeight: 700 }}
            >
              👁️ Preview
            </button>
            <button
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: `1px solid rgba(212,175,55,0.3)`, cursor: "pointer", background: "transparent", color: BODY, fontSize: "13px", fontWeight: 700 }}
            >
              💾 Save Draft
            </button>
            <button
              disabled
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", cursor: "not-allowed", background: "rgba(255,255,255,0.03)", color: "#4a4a65", fontSize: "13px", fontWeight: 700 }}
            >
              🖨️ Print (coming soon)
            </button>
          </div>

          {/* Certificate types reference */}
          <div style={{ marginTop: "28px", background: CARD, border: "1px solid rgba(212,175,55,0.18)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Available Certificate Types</h3>
            </div>
            <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {Object.entries(CERT_TYPES).map(([key, ct]) => (
                <button
                  key={key}
                  onClick={() => setCertType(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "8px",
                    border: `1px solid ${certType === key ? "rgba(123,44,191,0.5)" : "rgba(255,255,255,0.06)"}`,
                    background: certType === key ? "rgba(123,44,191,0.15)" : "transparent",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{ct.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: certType === key ? "#ffffff" : MUTED, lineHeight: 1.3 }}>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
      <div style={{ color: "#D8D8E8" }}>Loading…</div>
    </div>
  );
}

export default function CertificateNewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CertificateCreatorInner />
    </Suspense>
  );
}
