import type { CSSProperties } from "react";

export type CertificateTranslation = "kjv" | "niv";
export type CertificateTemplate = "purple" | "white";

type PremiumBirthdayCertificateProps = {
  churchName?: string;
  churchTagline?: string;
  childName?: string;
  ministerName?: string;
  ministerTitle?: string;
  date?: string;
  blessing?: string;
  translation?: CertificateTranslation;
  template?: CertificateTemplate;
};

const GOLD = "#D4AF37";
const DEEP_PURPLE = "#1C0A30";
const ROYAL_PURPLE = "#7B2CBF";
const LIGHT_GOLD = "#F8E6A0";

function formatDate(value?: string) {
  if (!value) return "June 10, 2026";
  try {
    return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function CornerOrnament({ position, ivory }: { position: "tl" | "tr" | "bl" | "br"; ivory: boolean }) {
  const base: CSSProperties = {
    position: "absolute",
    width: 110,
    height: 110,
    zIndex: 5,
    opacity: ivory ? 0.95 : 0.98,
  };

  const placement: Record<typeof position, CSSProperties> = {
    tl: { top: 18, left: 18 },
    tr: { top: 18, right: 18, transform: "scaleX(-1)" },
    bl: { bottom: 18, left: 18, transform: "scaleY(-1)" },
    br: { bottom: 18, right: 18, transform: "scale(-1)" },
  };

  const stroke = ivory ? "#9B741C" : GOLD;
  const accent = ivory ? "#B8860B" : LIGHT_GOLD;

  return (
    <svg viewBox="0 0 120 120" style={{ ...base, ...placement[position] }}>
      <path d="M10 110V10h100" fill="none" stroke={stroke} strokeWidth="4" />
      <path d="M24 96V24h72" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.8" />
      <path
        d="M30 30c24 4 30 24 12 38 26-3 42 12 36 40M38 24c-4 25 14 36 36 25M22 78c20-7 36 2 44 22"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="48" r="5" fill={accent} />
      <path d="M66 26l6 12 13 2-10 9 3 13-12-7-12 7 3-13-10-9 13-2z" fill={accent} opacity="0.9" />
    </svg>
  );
}

function Balloons({ side, ivory }: { side: "left" | "right"; ivory: boolean }) {
  const transform = side === "right" ? "scaleX(-1)" : undefined;
  const colors = ivory
    ? ["#5B1E8C", "#B8860B", "#7B2CBF"]
    : ["#9D4EDD", GOLD, "#5A189A"];

  return (
    <svg
      viewBox="0 0 180 230"
      style={{
        position: "absolute",
        bottom: 92,
        left: side === "left" ? 54 : "auto",
        right: side === "right" ? 54 : "auto",
        width: 145,
        height: 185,
        transform,
        zIndex: 6,
        opacity: 0.94,
      }}
    >
      <ellipse cx="50" cy="70" rx="32" ry="44" fill={colors[0]} />
      <ellipse cx="90" cy="48" rx="35" ry="48" fill={colors[1]} />
      <ellipse cx="128" cy="76" rx="32" ry="44" fill={colors[2]} />

      <ellipse cx="38" cy="53" rx="9" ry="6" fill="rgba(255,255,255,.38)" transform="rotate(-25 38 53)" />
      <ellipse cx="76" cy="30" rx="10" ry="6" fill="rgba(255,255,255,.35)" transform="rotate(-25 76 30)" />
      <ellipse cx="116" cy="60" rx="9" ry="6" fill="rgba(255,255,255,.32)" transform="rotate(-25 116 60)" />

      <path d="M50 115 C36 148 48 180 62 220" stroke={ivory ? "#8B6914" : GOLD} strokeWidth="1.8" fill="none" opacity=".75" />
      <path d="M90 98 C80 143 92 175 88 222" stroke={ivory ? "#8B6914" : GOLD} strokeWidth="1.8" fill="none" opacity=".75" />
      <path d="M128 122 C144 152 133 185 110 224" stroke={ivory ? "#8B6914" : GOLD} strokeWidth="1.8" fill="none" opacity=".75" />

      <path d="M44 116h12l-6 10zM84 99h12l-6 10zM122 123h12l-6 10z" fill={ivory ? "#8B6914" : GOLD} />
    </svg>
  );
}

function ChurchBrand({ churchName, churchTagline, ivory }: { churchName: string; churchTagline: string; ivory: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: "50%",
        transform: "translateX(-50%)",
        width: 500,
        minHeight: 96,
        borderRadius: 8,
        zIndex: 12,
        background: ivory
          ? "linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,235,198,.96))"
          : "linear-gradient(180deg, rgba(255,248,226,.98), rgba(235,211,145,.96))",
        border: `2px solid ${ivory ? "#B8860B" : GOLD}`,
        boxShadow: ivory ? "0 7px 18px rgba(0,0,0,.14)" : "0 0 32px rgba(212,175,55,.26)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "14px 32px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(139,105,20,.35)", borderRadius: 4 }} />
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 25,
            fontWeight: 900,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: DEEP_PURPLE,
            lineHeight: 1.05,
          }}
        >
          {churchName}
        </div>
        {churchTagline && (
          <div
            style={{
              marginTop: 7,
              fontFamily: "Georgia, serif",
              fontSize: 13,
              fontWeight: 700,
              fontStyle: "italic",
              letterSpacing: ".06em",
              color: "#3B2058",
            }}
          >
            {churchTagline}
          </div>
        )}
      </div>
    </div>
  );
}

function Ribbon({ ivory }: { ivory: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: 570,
        height: 42,
        background: "linear-gradient(90deg, #2B084E, #7B2CBF, #2B084E)",
        borderTop: `1px solid ${GOLD}`,
        borderBottom: `1px solid ${GOLD}`,
        color: LIGHT_GOLD,
        fontFamily: "Georgia, serif",
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: ".055em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 13,
        boxShadow: ivory ? "0 5px 14px rgba(0,0,0,.20)" : "0 7px 18px rgba(0,0,0,.38)",
      }}
    >
      Celebrating the Wonderful Gift God Has Given
      <div style={{ position: "absolute", left: -32, width: 0, height: 0, borderTop: "21px solid transparent", borderBottom: "21px solid transparent", borderRight: "32px solid #2B084E" }} />
      <div style={{ position: "absolute", right: -32, width: 0, height: 0, borderTop: "21px solid transparent", borderBottom: "21px solid transparent", borderLeft: "32px solid #2B084E" }} />
    </div>
  );
}

function MinistrySeal({ ivory }: { ivory: boolean }) {
  return (
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: "50%",
        background: ivory
          ? "radial-gradient(circle, #FFF8DB 0%, #D4AF37 45%, #8B6914 100%)"
          : "radial-gradient(circle, #FFF0A8 0%, #D4AF37 45%, #6B4200 100%)",
        border: ivory ? "3px solid #8B6914" : "3px solid #F8E6A0",
        boxShadow: ivory ? "0 4px 15px rgba(0,0,0,.18)" : "0 0 28px rgba(212,175,55,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "1.5px solid rgba(45,20,70,.72)",
          background: ivory ? "#FFF9E8" : "#16051F",
          color: ivory ? "#5E4210" : GOLD,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: 9,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: ".05em",
          textTransform: "uppercase",
        }}
      >
        ✝<br />Children&apos;s<br />Ministry
      </div>
    </div>
  );
}

export default function PremiumBirthdayCertificate({
  churchName,
  churchTagline,
  childName,
  ministerName,
  ministerTitle,
  date,
  blessing,
  translation = "kjv",
  template = "purple",
}: PremiumBirthdayCertificateProps) {
  const ivory = template === "white";

  const displayChurch = churchName?.trim() || "Grace Community Church";
  const displayTagline = churchTagline?.trim() || "Loving God • Loving People • Making Disciples";
  const displayChild = childName?.trim() || "Emma Johnson";
  const displayMinister = ministerName?.trim() || "Pastor Michael Anderson";
  const displayTitle = ministerTitle?.trim() || "Children’s Ministry Director";
  const displayDate = formatDate(date);

  const scripture =
    translation === "kjv"
      ? "For thou hast possessed my reins: thou hast covered me in my mother’s womb. I will praise thee; for I am fearfully and wonderfully made."
      : "For you created my inmost being; you knit me together in my mother’s womb. I praise you because I am fearfully and wonderfully made.";

  const background = ivory
    ? `
      radial-gradient(circle at 50% 30%, rgba(255,255,255,.95) 0%, rgba(253,250,239,.98) 42%, rgba(239,221,177,.96) 100%),
      repeating-linear-gradient(45deg, rgba(139,105,20,.035) 0px, rgba(139,105,20,.035) 1px, transparent 1px, transparent 9px)
    `
    : `
      radial-gradient(circle at 50% 18%, rgba(122,45,190,.42) 0%, rgba(15,5,35,.78) 36%, rgba(5,2,18,.98) 100%),
      repeating-linear-gradient(135deg, rgba(212,175,55,.03) 0px, rgba(212,175,55,.03) 1px, transparent 1px, transparent 10px),
      linear-gradient(160deg, #050212 0%, #16051F 55%, #090214 100%)
    `;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "11 / 8.5",
        overflow: "hidden",
        background,
        border: ivory ? "5px solid #8B6914" : `5px solid ${GOLD}`,
        boxSizing: "border-box",
        boxShadow: ivory ? "0 12px 34px rgba(0,0,0,.18)" : "0 18px 48px rgba(0,0,0,.56)",
        color: ivory ? DEEP_PURPLE : "#FFFFFF",
      }}
    >
      <div style={{ position: "absolute", inset: 12, border: ivory ? `2px solid ${GOLD}` : "2px solid #F8E6A0", zIndex: 3 }} />
      <div style={{ position: "absolute", inset: 24, border: ivory ? "1px solid rgba(139,105,20,.45)" : "1px solid rgba(212,175,55,.42)", zIndex: 3 }} />

      <CornerOrnament position="tl" ivory={ivory} />
      <CornerOrnament position="tr" ivory={ivory} />
      <CornerOrnament position="bl" ivory={ivory} />
      <CornerOrnament position="br" ivory={ivory} />

      <div
        style={{
          position: "absolute",
          top: ivory ? 28 : 23,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 14,
          color: ivory ? "#B8860B" : "#F8E6A0",
          fontSize: ivory ? 30 : 52,
          lineHeight: 1,
          textShadow: ivory ? "none" : "0 0 18px rgba(255,230,130,.85), 0 0 46px rgba(212,175,55,.45)",
          fontFamily: "Georgia, serif",
        }}
      >
        {ivory ? "♛" : "✝"}
      </div>

      <ChurchBrand churchName={displayChurch} churchTagline={displayTagline} ivory={ivory} />

      <Balloons side="left" ivory={ivory} />
      <Balloons side="right" ivory={ivory} />

      <div
        style={{
          position: "absolute",
          top: 214,
          left: "50%",
          transform: "translateX(-50%)",
          width: "82%",
          textAlign: "center",
          zIndex: 12,
          fontFamily: "Georgia, serif",
          fontSize: 56,
          lineHeight: 0.92,
          fontWeight: 900,
          letterSpacing: ".055em",
          textTransform: "uppercase",
          color: ivory ? "#3D145F" : GOLD,
          textShadow: ivory ? "0 1px 0 #FFF" : "0 2px 0 rgba(0,0,0,.55), 0 0 18px rgba(212,175,55,.18)",
        }}
      >
        Birthday Celebration
      </div>

      <Ribbon ivory={ivory} />

      <div
        style={{
          position: "absolute",
          top: 358,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 13,
          fontFamily: "Georgia, serif",
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: ivory ? "#6A4B16" : "#F9E7A2",
        }}
      >
        This certificate is presented to
      </div>

      <div
        style={{
          position: "absolute",
          top: 388,
          left: "50%",
          transform: "translateX(-50%)",
          width: "78%",
          textAlign: "center",
          zIndex: 13,
          fontFamily: "Georgia, serif",
          fontSize: 78,
          fontStyle: "italic",
          fontWeight: 900,
          lineHeight: 0.95,
          color: ivory ? "#3D145F" : "#FBE6A2",
          textShadow: ivory ? "0 1px 0 #FFF" : "0 3px 0 rgba(0,0,0,.45), 0 0 24px rgba(212,175,55,.15)",
        }}
      >
        {displayChild}
      </div>

      <div
        style={{
          position: "absolute",
          top: 496,
          left: "50%",
          transform: "translateX(-50%)",
          width: 620,
          minHeight: 100,
          zIndex: 13,
          background: ivory
            ? "linear-gradient(180deg, rgba(255,255,255,.86), rgba(244,225,180,.76))"
            : "linear-gradient(180deg, rgba(255,248,220,.97), rgba(234,209,139,.95))",
          border: ivory ? "2px solid #B8860B" : `2px solid ${GOLD}`,
          borderRadius: 9,
          boxShadow: ivory ? "0 5px 14px rgba(0,0,0,.11)" : "0 0 24px rgba(212,175,55,.20)",
          padding: "15px 42px",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(139,105,20,.28)", borderRadius: 5 }} />
        <p
          style={{
            position: "relative",
            zIndex: 2,
            margin: "0 0 7px",
            color: DEEP_PURPLE,
            fontSize: 16,
            lineHeight: 1.35,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
          }}
        >
          “{scripture}”
        </p>
        <p
          style={{
            position: "relative",
            zIndex: 2,
            margin: 0,
            color: "#7A5510",
            fontSize: 12,
            fontWeight: 900,
            fontFamily: "Georgia, serif",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Psalm 139:13–14 {translation.toUpperCase()}
        </p>
      </div>

      {blessing && (
        <div
          style={{
            position: "absolute",
            top: 620,
            left: "50%",
            transform: "translateX(-50%)",
            width: 690,
            textAlign: "center",
            zIndex: 13,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.42,
            color: ivory ? "#4E3B2A" : "rgba(255,255,255,.75)",
          }}
        >
          {blessing}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 150,
          right: 150,
          bottom: 104,
          height: 1,
          background: ivory
            ? "linear-gradient(90deg, transparent, rgba(139,105,20,.48), transparent)"
            : "linear-gradient(90deg, transparent, rgba(212,175,55,.48), transparent)",
          zIndex: 10,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 122,
          right: 122,
          bottom: 38,
          zIndex: 13,
          display: "grid",
          gridTemplateColumns: "1fr 130px 1fr",
          alignItems: "end",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 5 }}>
            Presented By
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1, marginBottom: 4 }}>
            {displayMinister}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: ivory ? "#4E3B2A" : "rgba(255,255,255,.78)", textTransform: "uppercase" }}>
            {displayTitle}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: ivory ? "#8B6914" : GOLD, textTransform: "uppercase" }}>
            {displayChurch}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <MinistrySeal ivory={ivory} />
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 6 }}>
            Presented On
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1 }}>
            {displayDate}
          </div>
        </div>
      </div>
    </div>
  );
}