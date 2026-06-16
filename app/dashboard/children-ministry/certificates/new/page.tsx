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
type Translation    = 'kjv' | 'niv';
type BlessingPreset = 'traditional' | 'encouragement' | 'future_calling';
type CertMeta = { label: string; icon: string; scripture: Record<Translation, string>; scriptureRef: string; subtitle?: string };

const CERT_TYPES: Record<string, CertMeta> = {
  birthday: {
    label: 'Birthday Celebration', icon: '🎈', scriptureRef: 'Psalm 139:13–14',
    subtitle: 'Celebrating the Wonderful Gift God Has Given',
    scripture: {
      kjv: `“For thou hast possessed my reins: thou hast covered me in my mother's womb. I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.”`,
      niv: `“For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.”`,
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

// ── Blessing presets ──────────────────────────────────────────────────────────
const CERT_BLESSINGS: Partial<Record<string, Record<BlessingPreset, string>>> = {
  birthday: {
    traditional:    'May God continue to bless your life with joy, wisdom, courage, and faith as you grow in His love. May His plans for your life be greater than you can imagine, and may you always know how deeply you are loved by Him and by your church family.',
    encouragement:  'As you celebrate another year of life, may you grow in grace, kindness, and understanding. May the Lord guide your steps, strengthen your faith, and fill your heart with His everlasting peace and joy.',
    future_calling: 'God has created you with a wonderful purpose and a bright future. May you walk confidently in His plans, use your gifts to serve others, and always trust that He is with you every step of your journey.',
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

// ── Birthday balloon motif ────────────────────────────────────────────────────
function BirthdayMotif({ template, side }: { template: "purple" | "white"; side: "left" | "right" }) {
  const isPurple = template === "purple";
  const mirror = side === "right";
  const purpleA = isPurple ? "#7B2CBF" : "#5B1E8C";
  const purpleB = isPurple ? "#B86BFF" : "#7B2CBF";
  const goldA = isPurple ? "#D4AF37" : "#B8860B";
  const goldB = isPurple ? "#FFF0A8" : "#E2BC58";
  const stringColor = isPurple ? "rgba(248,230,160,0.62)" : "rgba(139,105,20,0.46)";
  const sparkle = isPurple ? "rgba(248,230,160,0.78)" : "rgba(184,134,11,0.46)";

  return (
    <svg width="230" height="420" viewBox="0 0 230 420" style={{ overflow: "visible" as const, transform: mirror ? "scaleX(-1)" : undefined }} aria-hidden="true">
      <defs>
        <radialGradient id={`edgePurple-${side}`} cx="34%" cy="24%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.62" />
          <stop offset="19%" stopColor={purpleB} stopOpacity="0.96" />
          <stop offset="66%" stopColor={purpleA} stopOpacity="0.94" />
          <stop offset="100%" stopColor="#1B062B" stopOpacity="0.98" />
        </radialGradient>
        <radialGradient id={`edgeGold-${side}`} cx="35%" cy="20%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.70" />
          <stop offset="22%" stopColor={goldB} stopOpacity="1" />
          <stop offset="64%" stopColor={goldA} stopOpacity="0.98" />
          <stop offset="100%" stopColor="#704400" stopOpacity="0.98" />
        </radialGradient>
        <filter id={`edgeBalloonShadow-${side}`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#000000" floodOpacity={isPurple ? "0.48" : "0.18"} />
        </filter>
      </defs>

      <g filter={`url(#edgeBalloonShadow-${side})`} opacity={isPurple ? 0.94 : 0.78}>
        <ellipse cx="24" cy="92" rx="55" ry="72" fill={`url(#edgePurple-${side})`} />
        <ellipse cx="12" cy="68" rx="14" ry="10" fill="rgba(255,255,255,0.42)" transform="rotate(-18 12 68)" />
        <path d="M24 165l-10 12h20z" fill={purpleA} opacity=".68" />

        <ellipse cx="96" cy="166" rx="54" ry="72" fill={`url(#edgeGold-${side})`} />
        <ellipse cx="82" cy="141" rx="15" ry="10" fill="rgba(255,255,255,0.54)" transform="rotate(-18 82 141)" />
        <path d="M96 239l-10 12h20z" fill={goldA} opacity=".76" />

        <ellipse cx="28" cy="226" rx="58" ry="77" fill={`url(#edgePurple-${side})`} opacity=".97" />
        <ellipse cx="14" cy="199" rx="15" ry="10" fill="rgba(255,255,255,0.38)" transform="rotate(-18 14 199)" />
        <path d="M28 304l-10 12h20z" fill={purpleA} opacity=".68" />
      </g>

      <g fill="none" stroke={stringColor} strokeWidth="1.7" strokeLinecap="round" opacity=".78">
        <path d="M24 178C7 220 36 254 18 348" />
        <path d="M96 252C72 296 110 326 88 404" />
        <path d="M28 316C9 350 46 370 28 420" />
      </g>

      <g opacity=".78">
        <circle cx="151" cy="88" r="2.2" fill={sparkle} />
        <circle cx="178" cy="174" r="1.7" fill={sparkle} />
        <circle cx="139" cy="266" r="1.6" fill={sparkle} />
        <circle cx="183" cy="324" r="2.1" fill={sparkle} />
        <path d="M158 42l4 8 9 1.3-6.5 6.3 1.5 9-8-4.3-8 4.3 1.5-9-6.5-6.3 9-1.3z" fill={sparkle} opacity=".42" />
        <path d="M196 226l3 6 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1z" fill={sparkle} opacity=".35" />
      </g>
    </svg>
  );
}

// ── Church logo area placeholder removed ───────────────────────────────────────
// No placeholder should appear on a frame-worthy certificate.
// When logo upload is added later, render the real church logo here.
function ChurchLogoArea(_: { width: number; height: number; template: "purple" | "white" }) {
  return null;
}

// ── Ministry seal placeholder (gold coin medallion) ───────────────────────────
function MinistrySeal({ size, template }: { size: number; template: "purple" | "white" }) {
  const isPurple = template === "purple";
  const shadow = isPurple
    ? "0 10px 22px rgba(0,0,0,0.55), 0 0 28px rgba(212,175,55,0.18)"
    : "0 8px 18px rgba(90,60,10,0.18), 0 0 18px rgba(212,175,55,0.14)";

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 34% 26%, #FFF2B6 0%, #E9C75A 18%, #C99A22 42%, #8A5A0B 72%, #F3D46B 100%)",
        border: "2px solid #F8E6A0",
        boxShadow: shadow,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          inset: 5,
          borderRadius: "50%",
          border: "2px solid rgba(91,54,4,0.55)",
          boxShadow: "inset 0 2px 5px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(75,42,0,0.36)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 11,
          borderRadius: "50%",
          border: "1px solid rgba(255,246,197,0.75)",
        }}
      />
      <svg viewBox="0 0 100 100" style={{ width: Math.round(size * 0.62), height: Math.round(size * 0.62), position: "relative", zIndex: 2 }}>
        <defs>
          <linearGradient id="coinCrossGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF8C8" />
            <stop offset="42%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#7A4A05" />
          </linearGradient>
        </defs>
        <path
          d="M44 16h12v28h28v12H56v28H44V56H16V44h28z"
          fill="url(#coinCrossGold)"
          stroke="#5D3703"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M50 18v64M18 50h64"
          stroke="rgba(255,248,200,0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
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
  const meta      = CERT_TYPES[certType] ?? CERT_TYPES["spiritual_birthday"];
  const dispChild = childName     || "Child's Name";
  const dispChurch= churchName    || "Your Church Name";
  const dispMin   = ministerName  || "Minister's Name";
  const dispTitle = ministerTitle || "Children's Ministry Director";
  const dispDate  = date ? fmtCertDate(date) : "—";
  const isPurple  = template === "purple";

  // ── Theme tokens ──────────────────────────────────────────────────────────────
  const bg           = isPurple
    ? `radial-gradient(circle at 50% 42%, rgba(255,235,170,0.10), transparent 34%), radial-gradient(circle at 18% 18%, rgba(123,44,191,0.18), transparent 26%), radial-gradient(circle at 84% 74%, rgba(212,175,55,0.08), transparent 30%), linear-gradient(160deg, #050212 0%, #130828 50%, #0A0320 100%)`
    : `radial-gradient(circle at 50% 38%, rgba(255,255,255,0.58), transparent 38%), radial-gradient(circle at 85% 82%, rgba(212,175,55,0.10), transparent 30%), #FDFAEF`;
  const outerBorder  = isPurple ? `3px solid ${GOLD}`                  : "2.5px solid #8B6914";
  const midBorder    = isPurple ? "1px solid rgba(212,175,55,0.55)"    : "1px solid rgba(175,135,40,0.50)";
  const innerBorder  = isPurple ? "1px solid rgba(212,175,55,0.18)"    : "1px solid rgba(175,135,40,0.28)";
  const cornerClr    = isPurple ? GOLD                                  : "#8B6914";
  const titleClr     = isPurple ? GOLD                                  : "#1C0A2E";
  const nameClr      = isPurple ? "#FFFFFF"                             : "#1C0A2E";
  const subClr       = isPurple ? "rgba(212,175,55,0.72)"               : "#8B6914";
  const dimClr       = isPurple ? "rgba(255,255,255,0.40)"              : "#8B7355";
  const divClr       = isPurple ? "rgba(212,175,55,0.28)"               : "rgba(175,135,40,0.38)";
  const ornClr       = isPurple ? "rgba(212,175,55,0.58)"               : "#B8860B";
  const scriptClr    = isPurple ? "rgba(255,255,255,0.72)"              : "#4A3728";
  const scriptRef    = isPurple ? GOLD                                  : "#8B6914";
  const blessClr     = isPurple ? "rgba(255,255,255,0.55)"              : "#5C4A3A";
  const medallionBg  = isPurple ? "rgba(212,175,55,0.05)"               : "rgba(139,105,20,0.05)";
  const medallionBdr = isPurple ? "rgba(212,175,55,0.24)"               : "rgba(139,105,20,0.32)";
  const glow: React.CSSProperties = isPurple
    ? { boxShadow: "0 8px 56px rgba(5,2,18,0.80), 0 0 120px rgba(212,175,55,0.04)" }
    : { boxShadow: "0 4px 28px rgba(0,0,0,0.09)" };
  const crossGlow: React.CSSProperties = isPurple
    ? { textShadow: "0 0 18px rgba(212,175,55,0.70), 0 0 40px rgba(212,175,55,0.30)" }
    : {};

  return (
    <div style={{ position: "relative", background: bg, border: outerBorder, borderRadius: "4px", padding: "28px 46px 30px", width: "100%", boxSizing: "border-box", ...glow }}>
      {/* Second border line */}
      <div style={{ position: "absolute", inset: "6px", border: midBorder, borderRadius: "3px", pointerEvents: "none" }} />
      {/* Inner frame */}
      <div style={{ position: "absolute", inset: "13px", border: innerBorder, borderRadius: "2px", pointerEvents: "none" }} />

      {/* Corner L-brackets */}
      <div style={{ position: "absolute", top: "18px",    left: "18px",  width: "24px", height: "24px", borderTop:    `2px solid ${cornerClr}`, borderLeft:   `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", top: "18px",    right: "18px", width: "24px", height: "24px", borderTop:    `2px solid ${cornerClr}`, borderRight:  `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", bottom: "18px", left: "18px",  width: "24px", height: "24px", borderBottom: `2px solid ${cornerClr}`, borderLeft:   `2px solid ${cornerClr}` }} />
      <div style={{ position: "absolute", bottom: "18px", right: "18px", width: "24px", height: "24px", borderBottom: `2px solid ${cornerClr}`, borderRight:  `2px solid ${cornerClr}` }} />

      {/* Corner diamond accents */}
      <div style={{ position: "absolute", top: "14px",    left: "16px",  fontSize: "8px", color: cornerClr, opacity: 0.60, lineHeight: 1, userSelect: "none" as const }}>◆</div>
      <div style={{ position: "absolute", top: "14px",    right: "16px", fontSize: "8px", color: cornerClr, opacity: 0.60, lineHeight: 1, userSelect: "none" as const }}>◆</div>
      <div style={{ position: "absolute", bottom: "14px", left: "16px",  fontSize: "8px", color: cornerClr, opacity: 0.60, lineHeight: 1, userSelect: "none" as const }}>◆</div>
      <div style={{ position: "absolute", bottom: "14px", right: "16px", fontSize: "8px", color: cornerClr, opacity: 0.60, lineHeight: 1, userSelect: "none" as const }}>◆</div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: isPurple
            ? "radial-gradient(circle at 50% 46%, rgba(255,235,170,0.08), transparent 28%), radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,0.28) 100%)"
            : "radial-gradient(circle at 50% 46%, rgba(212,175,55,0.08), transparent 30%), radial-gradient(circle at 50% 50%, transparent 54%, rgba(139,105,20,0.08) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: isPurple ? 0.32 : 0.18,
          backgroundImage: isPurple
            ? "radial-gradient(circle at 12% 22%, rgba(248,230,160,0.50) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 18%, rgba(212,175,55,0.45) 0 1px, transparent 1.6px), radial-gradient(circle at 88% 78%, rgba(157,78,221,0.45) 0 1px, transparent 1.6px)"
            : "radial-gradient(circle at 18% 20%, rgba(139,105,20,0.35) 0 1px, transparent 1.6px), radial-gradient(circle at 82% 72%, rgba(212,175,55,0.30) 0 1px, transparent 1.6px)",
          backgroundSize: "190px 140px, 260px 210px, 220px 170px",
        }}
      />

      {certType === 'birthday' && (
        <>
          <div style={{ position: "absolute", left: "-58px", top: "72px", zIndex: 1, pointerEvents: "none" }}>
            <BirthdayMotif template={template} side="left" />
          </div>
          <div style={{ position: "absolute", right: "-58px", top: "108px", zIndex: 1, pointerEvents: "none" }}>
            <BirthdayMotif template={template} side="right" />
          </div>
        </>
      )}

      <div style={{ position: "relative", textAlign: "center", zIndex: 2 }}>

        {/* Sacred cross accent — flat brushed gold with soft glow */}
        <div
          style={{
            width: "38px",
            height: "50px",
            margin: "-4px auto 9px",
            position: "relative",
            filter: isPurple
              ? "drop-shadow(0 0 8px rgba(255,255,255,0.84)) drop-shadow(0 0 26px rgba(157,78,221,0.56))"
              : "drop-shadow(0 2px 4px rgba(139,105,20,0.18))",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              inset: "-14px -20px",
              background: isPurple
                ? "radial-gradient(circle, rgba(255,255,255,0.20), rgba(157,78,221,0.30) 38%, transparent 68%)"
                : "radial-gradient(circle, rgba(212,175,55,0.15), transparent 64%)",
              pointerEvents: "none",
            }}
          />
          <svg viewBox="0 0 80 96" style={{ position: "relative", width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id="topFlatCrossGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isPurple ? "#FFFFFF" : "#FFF4B8"} />
                <stop offset="46%" stopColor={isPurple ? "#F5EEFF" : "#D4AF37"} />
                <stop offset="100%" stopColor={isPurple ? "#B883FF" : "#7A4A05"} />
              </linearGradient>
              <linearGradient id="topFlatCrossTexture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
              </linearGradient>
            </defs>
            <path
              d="M34 4h12v32h20v12H46v44H34V48H14V36h20z"
              fill="url(#topFlatCrossGold)"
              stroke={isPurple ? "#FFF0A8" : "#8B6914"}
              strokeWidth="1.6"
              strokeLinejoin="miter"
            />
            <path
              d="M37 6h3v84M43 6h2v84M17 39h46M17 45h46"
              stroke="url(#topFlatCrossTexture)"
              strokeWidth="1"
              opacity=".55"
            />
          </svg>
        </div>

        {/* Church name */}
        <p style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.16em", color: titleClr, textTransform: "uppercase", margin: "0 0 4px", fontFamily: "Georgia, serif" }}>
          {dispChurch}
        </p>
        {churchTagline && (
          <p style={{ fontSize: "10px", color: subClr, margin: "0 0 2px", fontStyle: "italic", letterSpacing: "0.05em" }}>
            {churchTagline}
          </p>
        )}

        {/* ❖ ❖ ❖ ornamental rule */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0 13px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${divClr})` }} />
          <span style={{ color: ornClr, fontSize: "11px", letterSpacing: "0.28em" }}>❖ ❖ ❖</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${divClr})` }} />
        </div>

        {/* Certificate motif: birthday keeps balloons; all other certificates remain ceremonial and text-first */}
        {certType === 'birthday' && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2px" }}>
            <BirthdayMotif template={template} />
          </div>
        )}
        <h2 style={{
          fontSize: "25px", fontWeight: 700, color: titleClr, margin: "0 0 3px",
          fontFamily: "Georgia, serif", letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>
          {meta.label}
        </h2>
        {meta.subtitle && (
          <p style={{ fontSize: "13px", color: subClr, margin: "0 0 2px", fontStyle: "italic", letterSpacing: "0.04em" }}>
            {meta.subtitle}
          </p>
        )}

        {/* Title ribbon divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px auto 10px", maxWidth: "280px" }}>
          <div style={{ flex: 1, height: "1px", background: divClr }} />
          <div style={{ width: "5px", height: "5px", background: ornClr, transform: "rotate(45deg)", opacity: 0.75, flexShrink: 0 }} />
          <div style={{ flex: 1, height: "1px", background: divClr }} />
        </div>

        {/* Child Name — primary focal point */}
        <h1 style={{
          fontSize: "62px", fontWeight: 900, color: nameClr, margin: "0 0 12px",
          fontFamily: "Georgia, serif", lineHeight: 1.05, letterSpacing: "0.01em",
          fontStyle: "italic",
          textShadow: isPurple ? "0 3px 0 rgba(0,0,0,0.58), 0 0 34px rgba(212,175,55,0.18)" : "0 1px 0 rgba(255,255,255,0.75)",
        }}>
          {dispChild}
        </h1>

        {/* Rule below name */}
        <div style={{ height: "1px", background: divClr, margin: "0 8% 14px" }} />

        {/* Scripture plaque */}
        <div style={{
          position: "relative",
          border: `2px solid ${isPurple ? "rgba(212,175,55,0.62)" : "rgba(139,105,20,0.50)"}`,
          background: isPurple
            ? "linear-gradient(180deg, rgba(42,13,64,0.78), rgba(12,4,24,0.92))"
            : "linear-gradient(180deg, rgba(255,252,240,0.96), rgba(238,214,162,0.48))",
          borderRadius: "2px",
          padding: "15px 28px",
          maxWidth: "500px",
          margin: "0 auto 15px",
          boxShadow: isPurple
            ? "0 0 28px rgba(212,175,55,0.12), inset 0 0 22px rgba(255,255,255,0.035)"
            : "0 6px 16px rgba(0,0,0,0.08), inset 0 0 20px rgba(139,105,20,0.06)",
        }}>
          <div style={{ position: "absolute", inset: "6px", border: `1px solid ${isPurple ? "rgba(248,230,160,0.22)" : "rgba(139,105,20,0.24)"}`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", color: ornClr, fontSize: "16px", lineHeight: 1 }}>✦</div>
          <p style={{ position: "relative", zIndex: 1, fontSize: "13px", color: scriptClr, margin: "0 0 6px", lineHeight: 1.45, fontStyle: "italic" }}>
            {meta.scripture[translation]}
          </p>
          <p style={{ position: "relative", zIndex: 1, fontSize: "11px", fontWeight: 700, color: scriptRef, margin: 0, letterSpacing: "0.12em" }}>
            — {meta.scriptureRef} {translation.toUpperCase()}
          </p>
        </div>

        {/* Personalized blessing (optional) */}
        {blessing && (
          <>
            <div style={{ height: "1px", background: divClr, margin: "0 4% 13px" }} />
            <p style={{ fontSize: "11px", color: blessClr, lineHeight: 1.85, fontStyle: "italic", maxWidth: "430px", margin: "0 auto 12px" }}>
              {blessing}
            </p>
          </>
        )}

        {/* Bottom ❖ ornamental rule */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0 13px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${divClr})` }} />
          <span style={{ color: ornClr, fontSize: "9px" }}>❖</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${divClr})` }} />
        </div>

        {/* Bottom row: Presented By | Seal | Date */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>

          {/* Left: Presented By */}
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontSize: "8px", fontWeight: 700, color: dimClr, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px" }}>Presented By</p>
            <p style={{ fontSize: "17px", color: titleClr, margin: "0 0 2px", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.15 }}>{dispMin}</p>
            <p style={{ fontSize: "9px", color: dimClr, margin: "0 0 1px", letterSpacing: "0.05em" }}>{dispTitle}</p>
            <p style={{ fontSize: "9px", fontWeight: 600, color: subClr, margin: 0, letterSpacing: "0.04em" }}>{dispChurch}</p>
          </div>

          {/* Center: Ministry seal */}
          <div style={{ flexShrink: 0 }}>
            <MinistrySeal size={68} template={template} />
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
  const [ministerTitle, setMinisterTitle] = useState("Children's Ministry Director");
  const [parentEmail,   setParentEmail]   = useState("");
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10));
  const [blessing,       setBlessing]       = useState("");
  const [blessingPreset, setBlessingPreset] = useState<BlessingPreset | 'custom' | 'none'>('none');
  const [template,       setTemplate]       = useState<"purple" | "white">("purple");
  const [translation,   setTranslation]   = useState<Translation>("kjv");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  const backHref = childIdParam
    ? `/dashboard/children-ministry/children/${childIdParam}#celebration-timeline`
    : "/dashboard/children-ministry/children";

  async function saveDraft() {
    if (!childName.trim()) { setSaveError("Child name is required."); return; }
    setSaving(true); setSaveError(null);
    try {
      const meta = CERT_TYPES[certType];
      const r = await fetch("/api/children-ministry/certificates", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id:        childIdParam || null,
          cert_type:       certType,
          template,
          child_name:      childName.trim(),
          church_name:     churchName.trim() || null,
          church_tagline:  churchTagline.trim() || null,
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
                        {t === "purple" ? "👑 Royal Purple" : "📄 Classic Ivory"}
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
            Live Preview — {template === "purple" ? "Royal Purple Premium" : "Classic Ivory Premium"}
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
              onClick={saveDraft}
              disabled={saving}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.25)", cursor: saving ? "not-allowed" : "pointer", background: "transparent", color: BODY, fontSize: "13px", fontWeight: 700, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "💾 Save Draft"}
            </button>
            <button
              onClick={() => window.print()}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.35)", cursor: "pointer", background: "rgba(212,175,55,0.1)", color: GOLD, fontSize: "13px", fontWeight: 700 }}
            >
              🖨️ Print Certificate
            </button>
          </div>

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
