"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

// ── Palette ───────────────────────────────────────────────────────────────────
const ACCENT  = "#7B2CBF";
const ACCENT2 = "#9D4EDD";
const GOLD    = "#D4AF37";
const MUTED   = "#A9A9B8";
const BODY    = "#D8D8E8";
const CARD    = "#120A1F";

// ── Certificate type definitions ──────────────────────────────────────────────
type Translation = 'kjv' | 'niv';
type CertMeta = { label: string; icon: string; scripture: Record<Translation, string>; scriptureRef: string };

const CERT_TYPES: Record<string, CertMeta> = {
  birthday: {
    label: 'Birthday Celebration', icon: '🎂', scriptureRef: 'Numbers 6:24–25',
    scripture: {
      kjv: '“The Lord bless thee, and keep thee: the Lord make his face shine upon thee.”',
      niv: '“The Lord bless you and keep you; the Lord make his face shine on you.”',
    },
  },
  spiritual_birthday: {
    label: 'Spiritual Birthday', icon: '✝️', scriptureRef: 'Romans 8:31',
    scripture: {
      kjv: '“If God be for us, who can be against us?”',
      niv: '“If God is for us, who can be against us?”',
    },
  },
  baptism: {
    label: 'Baptism Celebration', icon: '💧', scriptureRef: '2 Corinthians 5:17',
    scripture: {
      kjv: '“Therefore if any man be in Christ, he is a new creature: old things are passed away; all things are become new.”',
      niv: '“Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!”',
    },
  },
  faith_milestone: {
    label: 'Faith Milestone', icon: '👑', scriptureRef: 'Philippians 4:13',
    scripture: {
      kjv: '“I can do all things through Christ which strengtheneth me.”',
      niv: '“I can do all this through him who gives me strength.”',
    },
  },
  scripture_memory: {
    label: 'Scripture Memory Award', icon: '📖', scriptureRef: 'Psalm 119:105',
    scripture: {
      kjv: '“Thy word is a lamp unto my feet, and a light unto my path.”',
      niv: '“Your word is a lamp for my feet, a light on my path.”',
    },
  },
  promotion: {
    label: 'Promotion Sunday', icon: '🎓', scriptureRef: 'Jeremiah 29:11',
    scripture: {
      kjv: '“For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil.”',
      niv: '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you.”',
    },
  },
  servant_heart: {
    label: 'Servant Heart Award', icon: '❤️', scriptureRef: 'Galatians 5:13',
    scripture: {
      kjv: '“By love serve one another.”',
      niv: '“Serve one another humbly in love.”',
    },
  },
  kindness: {
    label: 'Kindness Award', icon: '💛', scriptureRef: 'Ephesians 4:32',
    scripture: {
      kjv: '“And be ye kind one to another, tenderhearted, forgiving one another.”',
      niv: '“Be kind and compassionate to one another, forgiving each other.”',
    },
  },
  helper: {
    label: 'Helper Award', icon: '⭐', scriptureRef: 'Colossians 3:23',
    scripture: {
      kjv: '“Whatsoever ye do, do it heartily, as to the Lord, and not unto men.”',
      niv: '“Whatever you do, work at it with all your heart, as working for the Lord.”',
    },
  },
  attendance: {
    label: 'Attendance Award', icon: '📅', scriptureRef: 'Hebrews 10:25',
    scripture: {
      kjv: '“Not forsaking the assembling of ourselves together, as the manner of some is.”',
      niv: '“Not giving up meeting together, as some are in the habit of doing.”',
    },
  },
};

// ── Print styles ──────────────────────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  @page { size: landscape; margin: 0.4in; }
  body * { visibility: hidden; }
  #certificate-print-area, #certificate-print-area * { visibility: visible; }
  #certificate-print-area {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #certificate-print-area > div {
    width: 100%;
    max-width: 9.5in;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCertDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none", boxSizing: "border-box",
};

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{title}</p>
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Church logo mark placeholder ──────────────────────────────────────────────
function ChurchLogoMark({ name, size, template }: { name: string; size: number; template: "purple" | "white" }) {
  const words    = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0]?.[0]?.toUpperCase() ?? "✝");
  const isPurple = template === "purple";
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      border: `${size > 50 ? 2 : 1.5}px solid ${isPurple ? "rgba(212,175,55,0.65)" : "#8B6914"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: `${Math.round(size * 0.3)}px`, fontWeight: 700, fontFamily: "Georgia, serif",
      color: isPurple ? GOLD : "#8B6914",
      background: isPurple ? "rgba(26,8,62,0.85)" : "rgba(253,250,239,0.95)",
      boxShadow: isPurple ? `0 0 ${Math.round(size * 0.55)}px rgba(212,175,55,0.14)` : "none",
      flexShrink: 0, letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

// ── Premium certificate templates ─────────────────────────────────────────────
function CertPreview({
  childName, certType, churchName, churchTagline,
  ministerName, ministerTitle, date, blessing, template, translation,
}: {
  childName: string; certType: string; churchName: string; churchTagline: string;
  ministerName: string; ministerTitle: string; date: string; blessing: string;
  template: "purple" | "white"; translation: Translation;
}) {
  const meta         = CERT_TYPES[certType] ?? CERT_TYPES["spiritual_birthday"];
  const dispChild    = childName    || "Child’s Name";
  const dispChurch   = churchName   || "Your Church Name";
  const dispMin      = ministerName || "Minister’s Name";
  const dispTitle    = ministerTitle || "Children’s Ministry Director";
  const dispDate     = date ? fmtCertDate(date) : "—";
  const isPurple     = template === "purple";

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const bg          = isPurple
    ? "linear-gradient(158deg, #1A083E 0%, #32177A 45%, #220F55 100%)"
    : "#FDFAEF";
  const outerBorder = isPurple ? `3px solid ${GOLD}`           : "2.5px solid #8B6914";
  const innerBorder = isPurple ? "1px solid rgba(212,175,55,0.24)" : "1px solid rgba(175,135,40,0.35)";
  const cornerClr   = isPurple ? GOLD                          : "#8B6914";
  const titleClr    = isPurple ? GOLD                          : "#1C0A2E";
  const nameClr     = isPurple ? "#FFFFFF"                     : "#1C0A2E";
  const subClr      = isPurple ? "rgba(212,175,55,0.72)"       : "#8B6914";
  const dimClr      = isPurple ? "rgba(255,255,255,0.40)"      : "#8B7355";
  const divClr      = isPurple ? "rgba(212,175,55,0.28)"       : "rgba(175,135,40,0.38)";
  const ornClr      = isPurple ? "rgba(212,175,55,0.58)"       : "#B8860B";
  const scriptClr   = isPurple ? "rgba(255,255,255,0.72)"      : "#4A3728";
  const scriptRef   = isPurple ? GOLD                          : "#8B6914";
  const blessClr    = isPurple ? "rgba(255,255,255,0.55)"      : "#5C4A3A";
  const glow        = isPurple
    ? { boxShadow: "0 8px 56px rgba(26,8,62,0.65), 0 0 80px rgba(212,175,55,0.04)" }
    : { boxShadow: "0 4px 28px rgba(0,0,0,0.09)" };

  return (
    <div style={{ position: "relative", background: bg, border: outerBorder, borderRadius: "4px", padding: "30px 44px 26px", width: "100%", boxSizing: "border-box", ...glow }}>
      {/* Inner frame */}
      <div style={{ position: "absolute", inset: "12px", border: innerBorder, borderRadius: "2px", pointerEvents: "none" }} />
      {/* Corner ornaments */}
      <div style={{ position: "absolute", top: "18px",    left: "18px",  width: "22px", height: "22px", borderTop:    `2px solid ${cornerClr}`, borderLeft:   `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", top: "18px",    right: "18px", width: "22px", height: "22px", borderTop:    `2px solid ${cornerClr}`, borderRight:  `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", bottom: "18px", left: "18px",  width: "22px", height: "22px", borderBottom: `2px solid ${cornerClr}`, borderLeft:   `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", bottom: "18px", right: "18px", width: "22px", height: "22px", borderBottom: `2px solid ${cornerClr}`, borderRight:  `2px solid ${cornerClr}` }} />

      <div style={{ position: "relative", textAlign: "center" }}>

        {/* Classic White: royal crown above church mark */}
        {!isPurple && <div style={{ fontSize: "26px", lineHeight: 1, marginBottom: "6px" }}>👑</div>}

        {/* Church logo mark */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <ChurchLogoMark name={dispChurch} size={isPurple ? 58 : 52} template={template} />
        </div>

        {/* Church name */}
        <p style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", color: titleClr, textTransform: "uppercase", margin: "0 0 3px", fontFamily: "Georgia, serif" }}>
          {dispChurch}
        </p>
        {churchTagline && (
          <p style={{ fontSize: "10px", color: subClr, margin: 0, fontStyle: "italic", letterSpacing: "0.05em" }}>
            {churchTagline}
          </p>
        )}

        {/* Top ornamental rule */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "13px 0 15px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${divClr})` }} />
          <span style={{ color: ornClr, fontSize: "11px", letterSpacing: "0.28em" }}>❖ ❖ ❖</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${divClr})` }} />
        </div>

        {/* Icon + Title */}
        <div style={{ fontSize: "34px", lineHeight: 1, marginBottom: "7px" }}>{meta.icon}</div>
        <h2 style={{ fontSize: "21px", fontWeight: 700, color: titleClr, margin: "0 0 13px", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}>
          {meta.label}
        </h2>

        {/* Rule above name */}
        <div style={{ height: "1px", background: divClr, margin: "0 8% 13px" }} />

        {/* Child Name — focal point */}
        <h1 style={{ fontSize: "42px", fontWeight: 900, color: nameClr, margin: "0 0 11px", fontFamily: "Georgia, serif", lineHeight: 1.05, letterSpacing: "0.01em" }}>
          {dispChild}
        </h1>

        {/* Rule below name */}
        <div style={{ height: "1px", background: divClr, margin: "0 8% 13px" }} />

        {/* Scripture */}
        <p style={{ fontSize: "12px", color: scriptClr, margin: "0 0 5px", lineHeight: 1.75, maxWidth: "420px", marginLeft: "auto", marginRight: "auto", fontStyle: "italic" }}>
          {meta.scripture[translation]}
        </p>
        <p style={{ fontSize: "11px", fontWeight: 600, color: scriptRef, margin: 0, letterSpacing: "0.08em" }}>
          — {meta.scriptureRef} {translation.toUpperCase()}
        </p>

        {/* Personalized blessing (optional) */}
        {blessing && (
          <>
            <div style={{ height: "1px", background: divClr, margin: "13px 4% 13px" }} />
            <p style={{ fontSize: "11px", color: blessClr, margin: 0, lineHeight: 1.85, fontStyle: "italic", maxWidth: "430px", marginLeft: "auto", marginRight: "auto" }}>
              {blessing}
            </p>
          </>
        )}

        {/* Bottom ornamental rule */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "13px 0 11px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${divClr})` }} />
          <span style={{ color: ornClr, fontSize: "9px" }}>❖</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${divClr})` }} />
        </div>

        {/* Bottom row: Presented By | Church Seal | Date */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>

          {/* Left: Presented By */}
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontSize: "8px", fontWeight: 700, color: dimClr, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px" }}>Presented By</p>
            <p style={{ fontSize: "17px", color: titleClr, margin: "0 0 2px", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.15 }}>{dispMin}</p>
            <p style={{ fontSize: "9px", color: dimClr, margin: "0 0 1px", letterSpacing: "0.05em" }}>{dispTitle}</p>
            <p style={{ fontSize: "9px", fontWeight: 600, color: subClr, margin: 0, letterSpacing: "0.04em" }}>{dispChurch}</p>
          </div>

          {/* Center: Church seal */}
          <div style={{ flexShrink: 0 }}>
            <ChurchLogoMark name={dispChurch} size={40} template={template} />
          </div>

          {/* Right: Date */}
          <div style={{ textAlign: "right", flex: 1 }}>
            <p style={{ fontSize: "8px", fontWeight: 700, color: dimClr, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px" }}>Date of Presentation</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: titleClr, margin: 0, fontFamily: "Georgia, serif" }}>{dispDate}</p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main creator ──────────────────────────────────────────────────────────────
function CertificateCreatorInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const childIdParam   = searchParams.get("childId")   ?? "";
  const childNameParam = searchParams.get("childName") ?? "";
  const typeParam      = searchParams.get("type")      ?? "spiritual_birthday";

  const [childName,     setChildName]     = useState(childNameParam);
  const [certType,      setCertType]      = useState(Object.hasOwn(CERT_TYPES, typeParam) ? typeParam : "spiritual_birthday");
  const [churchName,    setChurchName]    = useState("");
  const [churchTagline, setChurchTagline] = useState("");
  const [ministerName,  setMinisterName]  = useState("");
  const [ministerTitle, setMinisterTitle] = useState("Children’s Ministry Director");
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10));
  const [blessing,      setBlessing]      = useState("");
  const [template,      setTemplate]      = useState<"purple" | "white">("purple");
  const [translation,   setTranslation]   = useState<Translation>("kjv");

  const backHref = childIdParam
    ? `/dashboard/children-ministry/children/${childIdParam}#celebration-timeline`
    : "/dashboard/children-ministry/children";

  return (
    <AppShell navItems={[]}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ padding: "32px 32px 24px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
        <button
          onClick={() => router.push(backHref)}
          style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "13px", padding: 0, marginBottom: "14px", display: "flex", alignItems: "center", gap: "5px" }}
        >
          ← Back
        </button>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase", margin: "0 0 6px" }}>
          Certificates
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
          🎓 Certificate Creator
        </h1>
        <p style={{ fontSize: "13px", color: MUTED, margin: "6px 0 0" }}>
          Design a premium keepsake certificate your families will treasure.
        </p>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px", display: "grid", gridTemplateColumns: "420px 1fr", gap: "32px", alignItems: "start" }}>

        {/* ── Form panel ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "sticky", top: "24px" }}>

          {/* Child & Certificate */}
          <FormSection title="Child & Certificate">
            <div>
              <FieldLabel>Child Name</FieldLabel>
              <input type="text" value={childName} onChange={e => setChildName(e.target.value)}
                placeholder="Enter child's full name" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Certificate Type</FieldLabel>
              <select value={certType} onChange={e => setCertType(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(CERT_TYPES).map(([key, ct]) => (
                  <option key={key} value={key} style={{ background: "#120A1F" }}>
                    {ct.icon} {ct.label}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          {/* Church Identity */}
          <FormSection title="Church Identity">
            <div>
              <FieldLabel>Church Name</FieldLabel>
              <input type="text" value={churchName} onChange={e => setChurchName(e.target.value)}
                placeholder="Your church name" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Church Tagline <span style={{ color: "#4a4a65", fontWeight: 400, textTransform: "none" }}>(optional)</span></FieldLabel>
              <input type="text" value={churchTagline} onChange={e => setChurchTagline(e.target.value)}
                placeholder="e.g., Where Faith Grows" style={inputStyle} />
            </div>
          </FormSection>

          {/* Presenter */}
          <FormSection title="Presenter">
            <div>
              <FieldLabel>Minister Name</FieldLabel>
              <input type="text" value={ministerName} onChange={e => setMinisterName(e.target.value)}
                placeholder="Name of presenting minister" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Minister Title</FieldLabel>
              <input type="text" value={ministerTitle} onChange={e => setMinisterTitle(e.target.value)}
                style={inputStyle} />
            </div>
          </FormSection>

          {/* Certificate Content */}
          <FormSection title="Certificate Content">
            <div>
              <FieldLabel>Date of Presentation</FieldLabel>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" as never }} />
            </div>
            <div>
              <FieldLabel>Bible Translation</FieldLabel>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["kjv", "niv"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTranslation(t)}
                    style={{
                      flex: 1, padding: "9px 8px", borderRadius: "8px", cursor: "pointer",
                      border: `2px solid ${translation === t ? ACCENT2 : "rgba(212,175,55,0.2)"}`,
                      background: translation === t ? "rgba(123,44,191,0.2)" : "transparent",
                      color: translation === t ? "#ffffff" : MUTED,
                      fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em",
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Personalized Blessing <span style={{ color: "#4a4a65", fontWeight: 400, textTransform: "none" }}>(optional)</span></FieldLabel>
              <textarea
                value={blessing}
                onChange={e => setBlessing(e.target.value)}
                placeholder={"May God continue to guide your steps, strengthen your faith, and fill your heart with His love as you grow in Him each day.\n\nYour church family rejoices in what God is doing in your life."}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" as const, lineHeight: "1.5" }}
              />
            </div>
          </FormSection>

          {/* Template */}
          <FormSection title="Template">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(["purple", "white"] as const).map(t => {
                const active = template === t;
                return (
                  <button key={t} onClick={() => setTemplate(t)} style={{
                    padding: 0, borderRadius: "12px", overflow: "hidden", cursor: "pointer",
                    border: `2px solid ${active ? (t === "purple" ? ACCENT2 : "#8B6914") : "rgba(212,175,55,0.15)"}`,
                    background: active ? (t === "purple" ? "rgba(123,44,191,0.2)" : "rgba(253,250,239,0.06)") : "transparent",
                  }}>
                    {/* Color swatch */}
                    <div style={{ height: "28px", background: t === "purple" ? "linear-gradient(135deg, #1A083E, #32177A)" : "#FDFAEF", borderBottom: `1px solid ${t === "purple" ? "rgba(212,175,55,0.25)" : "#C9A84C"}` }} />
                    <div style={{ padding: "7px 8px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, margin: 0, color: active ? (t === "purple" ? ACCENT2 : "#B8860B") : MUTED }}>
                        {t === "purple" ? "👑 Royal Purple" : "📄 Classic White"}
                      </p>
                      <p style={{ fontSize: "9px", color: "#4a4a65", margin: "2px 0 0" }}>Premium</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* Certificate Settings — Coming Soon */}
          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(212,175,55,0.12)", borderRadius: "12px", padding: "14px 16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#4a4a65", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              ⚙️ Certificate Settings — Coming Soon
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                "Church logo upload",
                "Signature image upload",
                "Church seal design",
                "Custom scripture per type",
                "Multi-language support",
                "Photo integration",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#4a4a65", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", color: "#4a4a65", flex: 1 }}>{item}</span>
                  <span style={{ fontSize: "9px", color: "#3a3a52" }}>soon</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Preview panel ────────────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Live Preview — {template === "purple" ? "Royal Purple Premium" : "Classic White Premium"}
          </p>

          <div id="certificate-print-area">
            <CertPreview
              childName={childName}
              certType={certType}
              churchName={churchName}
              churchTagline={churchTagline}
              ministerName={ministerName}
              ministerTitle={ministerTitle}
              date={date}
              blessing={blessing}
              template={template}
              translation={translation}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: "#ffffff", fontSize: "13px", fontWeight: 700 }}
            >
              👁️ Preview
            </button>
            <button
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.25)", cursor: "pointer", background: "transparent", color: BODY, fontSize: "13px", fontWeight: 700 }}
            >
              💾 Save Draft
            </button>
            <button
              onClick={() => window.print()}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.35)", cursor: "pointer", background: "rgba(212,175,55,0.1)", color: GOLD, fontSize: "13px", fontWeight: 700 }}
            >
              🖨️ Print Certificate
            </button>
          </div>

          {/* Print tip */}
          <p style={{ fontSize: "11px", color: MUTED, margin: "10px 0 0", padding: "8px 12px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: "8px", lineHeight: 1.5 }}>
            💡 <strong style={{ color: BODY }}>Print tip:</strong> Use landscape orientation and disable headers/footers for best results.
          </p>

          {/* Certificate type quick-select */}
          <div style={{ marginTop: "28px", background: CARD, border: "1px solid rgba(212,175,55,0.18)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
              <h3 style={{ fontSize: "11px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                Certificate Types
              </h3>
            </div>
            <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {Object.entries(CERT_TYPES).map(([key, ct]) => (
                <button
                  key={key}
                  onClick={() => setCertType(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    border: `1px solid ${certType === key ? "rgba(123,44,191,0.5)" : "rgba(255,255,255,0.06)"}`,
                    background: certType === key ? "rgba(123,44,191,0.15)" : "transparent",
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
      <div style={{ color: BODY }}>Loading…</div>
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
