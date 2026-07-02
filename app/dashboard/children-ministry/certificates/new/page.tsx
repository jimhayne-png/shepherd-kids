"use client";

import { Suspense, useRef, useState } from "react";
import type React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CertificateCanvas from "@/components/certificates-v3/CertificateCanvas";
import CertificateExportButtons from "@/components/certificates-v3/CertificateExportButtons";
import type { CertTemplate } from "@/components/certificates-v3/types";

// ── Palette ───────────────────────────────────────────────────────────────────
const ACCENT2 = "#9D4EDD";
const GOLD    = "#D4AF37";
const MUTED   = "#A9A9B8";
const BODY    = "#D8D8E8";
const CARD    = "#120A1F";

// ── Certificate type definitions ──────────────────────────────────────────────
type Translation    = 'kjv' | 'niv';
type BlessingPreset = 'traditional' | 'encouragement' | 'future_calling';
type CertMeta = { label: string; icon: string; scripture: Record<Translation, string>; scriptureRef: string; subtitle?: string };

const CERT_TYPES: Record<string, CertMeta> = {
  birthday: {
    label: 'Birthday Celebration', icon: '🎈', scriptureRef: 'Psalm 139:13–14',
    subtitle: 'Celebrating the Wonderful Gift God Has Given',
    scripture: {
      kjv: `"For thou hast possessed my reins: thou hast covered me in my mother's womb. I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well."`,
      niv: `"For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well."`,
    },
  },
  spiritual_birthday: {
    label: 'Spiritual Birthday', icon: '✝️', scriptureRef: 'Romans 8:31',
    scripture: {
      kjv: '"If God be for us, who can be against us?"',
      niv: '"If God is for us, who can be against us?"',
    },
  },
  baptism: {
    label: 'Baptism Celebration', icon: '💧', scriptureRef: '2 Corinthians 5:17',
    scripture: {
      kjv: '"Therefore if any man be in Christ, he is a new creature: old things are passed away; all things are become new."',
      niv: '"Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!"',
    },
  },
  faith_milestone: {
    label: 'Faith Milestone', icon: '👑', scriptureRef: 'Philippians 4:13',
    scripture: {
      kjv: '"I can do all things through Christ which strengtheneth me."',
      niv: '"I can do all this through him who gives me strength."',
    },
  },
  scripture_memory: {
    label: 'Scripture Memory Award', icon: '📖', scriptureRef: 'Psalm 119:105',
    scripture: {
      kjv: '"Thy word is a lamp unto my feet, and a light unto my path."',
      niv: '"Your word is a lamp for my feet, a light on my path."',
    },
  },
  promotion: {
    label: 'Promotion Sunday', icon: '🎓', scriptureRef: 'Jeremiah 29:11',
    scripture: {
      kjv: '"For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil."',
      niv: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you."',
    },
  },
  servant_heart: {
    label: 'Servant Heart Award', icon: '❤️', scriptureRef: 'Galatians 5:13',
    scripture: {
      kjv: '"By love serve one another."',
      niv: '"Serve one another humbly in love."',
    },
  },
  kindness: {
    label: 'Kindness Award', icon: '💛', scriptureRef: 'Ephesians 4:32',
    scripture: {
      kjv: '"And be ye kind one to another, tenderhearted, forgiving one another."',
      niv: '"Be kind and compassionate to one another, forgiving each other."',
    },
  },
  helper: {
    label: 'Helper Award', icon: '⭐', scriptureRef: 'Colossians 3:23',
    scripture: {
      kjv: '"Whatsoever ye do, do it heartily, as to the Lord, and not unto men."',
      niv: '"Whatever you do, work at it with all your heart, as working for the Lord."',
    },
  },
  attendance: {
    label: 'Attendance Award', icon: '📅', scriptureRef: 'Hebrews 10:25',
    scripture: {
      kjv: '"Not forsaking the assembling of ourselves together, as the manner of some is."',
      niv: '"Not giving up meeting together, as some are in the habit of doing."',
    },
  },
};

// ── Blessing presets ──────────────────────────────────────────────────────────
const CERT_BLESSINGS: Partial<Record<string, Record<BlessingPreset, string>>> = {
  birthday: {
    traditional:    'May God continue to bless your life with joy, wisdom, courage, and faith as you grow in His love. May His plans for your life be greater than you can imagine, and may you always know how deeply you are loved by Him and by your church family.',
    encouragement:  'As you celebrate another year of life, may you grow in grace, kindness, and understanding. May the Lord guide your steps, strengthen your faith, and fill your heart with His everlasting peace and joy.',
    future_calling: 'God has created you with a wonderful purpose and a bright future. May you walk confidently in His plans, use your gifts to serve others, and always trust that He is with you every step of your journey.',
  },
};


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
  const [ministerName,  setMinisterName]  = useState("");
  const [ministerTitle, setMinisterTitle] = useState("Children's Ministry Director");
  const [parentEmail,   setParentEmail]   = useState("");
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10));
  const [blessing,       setBlessing]       = useState("");
  const [blessingPreset, setBlessingPreset] = useState<BlessingPreset | 'custom' | 'none'>('none');
  const [template,       setTemplate]       = useState<CertTemplate>("premium");
  const [translation,   setTranslation]   = useState<Translation>("kjv");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  const backHref = childIdParam
    ? `/dashboard/children-ministry/children/${childIdParam}#celebration-timeline`
    : "/dashboard/children-ministry/children";

  const meta = CERT_TYPES[certType];

  // Build the live CertificateData from current form state
  const certData = {
    certType,
    template,
    childName:     childName     || "Child's Name",
    churchName:    churchName    || undefined,
    ministerName:  ministerName  || undefined,
    ministerTitle: ministerTitle || undefined,
    date:          date ? fmtCertDate(date) : undefined,
    verse:         meta?.scripture[translation] ?? undefined,
    reference:     meta?.scriptureRef ?? undefined,
    translation,
    blessing:      blessing || undefined,
  };

  async function saveDraft() {
    if (!childName.trim()) { setSaveError("Child name is required."); return; }
    setSaving(true); setSaveError(null);
    try {
      const r = await fetch("/api/children-ministry/certificates", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id:        childIdParam || null,
          cert_type:       certType,
          template,
          child_name:      childName.trim(),
          church_name:     churchName.trim() || null,
          minister_name:   ministerName.trim() || null,
          minister_title:  ministerTitle.trim() || null,
          verse:           meta?.scripture[translation] ?? null,
          reference:       meta?.scriptureRef ?? null,
          translation,
          blessing:        blessing.trim() || null,
          presentation_date: date || null,
          parent_email:    parentEmail.trim() || null,
          status:          "draft",
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSaveError(d.error ?? "Failed to save."); return; }
      router.push(`/dashboard/children-ministry/certificates/${d.certificate.id}`);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell navItems={[]}>


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
          Certificate Creator
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
              <select value={certType} onChange={e => { setCertType(e.target.value); setBlessingPreset('none'); }}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(CERT_TYPES).map(([key, ct]) => (
                  <option key={key} value={key} style={{ background: "#120A1F" }}>
                    {ct.icon} {ct.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Parent Email <span style={{ color: "#4a4a65", fontWeight: 400, textTransform: "none" }}>(optional — for sending PDF later)</span></FieldLabel>
              <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)}
                placeholder="parent@example.com" style={inputStyle} />
            </div>
          </FormSection>

          {/* Church Identity */}
          <FormSection title="Church Identity">
            <div>
              <FieldLabel>Church Name</FieldLabel>
              <input type="text" value={churchName} onChange={e => setChurchName(e.target.value)}
                placeholder="Your church name" style={inputStyle} />
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
              {/* Blessing preset selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                {(["none", "traditional", "encouragement", "future_calling", "custom"] as const).map(p => {
                  const active  = blessingPreset === p;
                  const hasData = p !== 'custom' && p !== 'none' && !!CERT_BLESSINGS[certType]?.[p as BlessingPreset];
                  const labels: Record<typeof p, string> = {
                    none:           'None',
                    traditional:    'Traditional',
                    encouragement:  'Encouragement',
                    future_calling: 'Future Calling',
                    custom:         'Custom',
                  };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (p === 'none') {
                          setBlessingPreset('none');
                          setBlessing('');
                        } else if (p === 'custom') {
                          setBlessingPreset('custom');
                        } else {
                          const presets = CERT_BLESSINGS[certType];
                          if (presets) {
                            setBlessingPreset(p);
                            setBlessing(presets[p as BlessingPreset]);
                          }
                        }
                      }}
                      style={{
                        padding: "7px 6px", borderRadius: "7px", cursor: "pointer", fontSize: "11px",
                        fontWeight: active ? 700 : 400,
                        border: `1.5px solid ${active ? ACCENT2 : "rgba(212,175,55,0.18)"}`,
                        background: active ? "rgba(123,44,191,0.22)" : "transparent",
                        color: active ? "#ffffff" : hasData || p === 'custom' || p === 'none' ? MUTED : "#4a4a65",
                        letterSpacing: "0.02em",
                        gridColumn: p === 'custom' ? "1 / -1" : undefined,
                      }}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={blessing}
                onChange={e => { setBlessing(e.target.value); setBlessingPreset('custom'); }}
                placeholder="Select a preset above, or type a custom blessing…"
                rows={4}
                style={{ ...inputStyle, resize: "vertical" as const, lineHeight: "1.5" }}
              />
            </div>
          </FormSection>

          {/* Template */}
          <FormSection title="Template">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {([
                {
                  key: "premium",
                  label: "Premium Colors",
                  sublabel: "Full color",
                  swatch: "linear-gradient(135deg, #1A083E, #32177A)",
                  activeColor: ACCENT2,
                  activeBg: "rgba(123,44,191,0.2)",
                  borderColor: "rgba(212,175,55,0.25)",
                  icon: "👑",
                },
                {
                  key: "classic",
                  label: "Classic",
                  sublabel: "Ivory",
                  swatch: "#FDFAEF",
                  activeColor: "#B8860B",
                  activeBg: "rgba(253,250,239,0.06)",
                  borderColor: "#C9A84C",
                  icon: "📄",
                },
                {
                  key: "minimal",
                  label: "Minimal",
                  sublabel: "Simple",
                  swatch: "linear-gradient(135deg, #F8F4E8, #FFFFFF)",
                  activeColor: "#D4AF37",
                  activeBg: "rgba(212,175,55,0.08)",
                  borderColor: "#D4AF37",
                  icon: "⬜",
                },
              ] as const).map(t => {
                const active = template === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplate(t.key)}
                    style={{
                      padding: 0,
                      borderRadius: "12px",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: `2px solid ${active ? t.activeColor : "rgba(212,175,55,0.15)"}`,
                      background: active ? t.activeBg : "transparent",
                    }}
                  >
                    <div
                      style={{
                        height: "28px",
                        background: t.swatch,
                        borderBottom: `1px solid ${t.borderColor}`,
                      }}
                    />
                    <div style={{ padding: "7px 8px" }}>
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          margin: 0,
                          color: active ? t.activeColor : MUTED,
                        }}
                      >
                        {t.icon} {t.label}
                      </p>
                      <p style={{ fontSize: "9px", color: "#4a4a65", margin: "2px 0 0" }}>
                        {t.sublabel}
                      </p>
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
            Live Preview — {template === "premium" ? "Premium Colors" : template === "classic" ? "Classic" : "Minimal"}
          </p>

          <div ref={certRef}>
            <CertificateCanvas data={certData} />
          </div>

          {/* Save draft */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={saveDraft}
              disabled={saving}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.25)", cursor: saving ? "not-allowed" : "pointer", background: "transparent", color: BODY, fontSize: "13px", fontWeight: 700, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "💾 Save Draft"}
            </button>
          </div>

          {/* Export — same rendering path as the certificate detail page */}
          <CertificateExportButtons
            certRef={certRef}
            filename={childName.trim() ? `${childName.trim().replace(/\s+/g, "-").toLowerCase()}-certificate` : "certificate"}
          />

          {saveError && (
            <p style={{ fontSize: "11px", color: "#FF6B6B", margin: "8px 0 0" }}>{saveError}</p>
          )}

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
