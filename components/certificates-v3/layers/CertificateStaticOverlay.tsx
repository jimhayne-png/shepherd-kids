"use client";

import type { CertificateData } from "../types";

const TYPE_CONFIG: Record<string, { title: string; subtitle: string; body: string; blessing: string }> = {
  birthday: {
    title: "Happy Birthday!",
    subtitle: "CELEBRATING GOD'S AMAZING GIFT OF YOU",
    body: "This certificate celebrates the wonderful gift of you\nand the joy you bring to our church family.",
    blessing: "May God bless you today and always as you grow in His love!",
  },
  spiritual_birthday: {
    title: "Spiritual Birthday!",
    subtitle: "THE DAY YOU GAVE YOUR HEART TO JESUS",
    body: "This certificate honors the most important decision of your life —\nchoosing to follow Jesus Christ as Lord.",
    blessing: "May you grow in faith, love, and wisdom as you walk with the Lord.",
  },
  baptism: {
    title: "Baptized!",
    subtitle: "FOLLOWING JESUS IN BELIEVER'S BAPTISM",
    body: "This certificate celebrates your public declaration of faith\nthrough the waters of baptism.",
    blessing: "May your baptism be a reminder of the new life you have in Christ.",
  },
  faith_milestone: {
    title: "Faith Milestone!",
    subtitle: "GROWING IN FAITH AND KNOWLEDGE",
    body: "This certificate recognizes a meaningful step forward\nin your faith journey with Jesus.",
    blessing: "May God continue to guide your steps as you grow in His grace.",
  },
  scripture_memory: {
    title: "Scripture Memory!",
    subtitle: "HIDING GOD'S WORD IN YOUR HEART",
    body: "This certificate honors your commitment to memorizing\nand treasuring the Word of God.",
    blessing: "May God's Word be a lamp unto your feet and a light unto your path.",
  },
  attendance: {
    title: "Faithful Attendance!",
    subtitle: "FAITHFUL AND PRESENT",
    body: "This certificate celebrates your faithful presence\nand commitment to our church family.",
    blessing: "May your faithfulness be a blessing to all who know you.",
  },
  promotion: {
    title: "Promotion Sunday!",
    subtitle: "MOVING FORWARD IN FAITH",
    body: "This certificate recognizes your growth and readiness\nto take your next step in ministry.",
    blessing: "May God lead you forward with courage, joy, and faith.",
  },
  servant_heart: {
    title: "Servant Heart!",
    subtitle: "FOLLOWING JESUS BY SERVING OTHERS",
    body: "This certificate honors the servant heart you have shown\nto our church family and beyond.",
    blessing: "May you always find joy in serving others as Jesus served us.",
  },
  kindness: {
    title: "Kindness Award!",
    subtitle: "LOVING OTHERS AS JESUS LOVES US",
    body: "This certificate celebrates the kindness and love\nyou have shown to those around you.",
    blessing: "May your kindness be a light that leads others to Christ.",
  },
  helper: {
    title: "Helper Award!",
    subtitle: "A HELPING HAND FOR GOD'S GLORY",
    body: "This certificate honors your willingness to help\nand serve with a joyful heart.",
    blessing: "May God bless every act of help and service you offer in His name.",
  },
};

const DEFAULT_CONFIG = {
  title: "Well Done!",
  subtitle: "A SPECIAL RECOGNITION",
  body: "This certificate celebrates a meaningful achievement\nin your faith journey.",
  blessing: "May God's blessings follow you all the days of your life.",
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

function center(top: string): React.CSSProperties {
  return {
    position: "absolute",
    top,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
  };
}

// Text-only overlay for static-background certificates.
// All positions are percentage-based so the layout scales with the container.
// No boxes, borders, backgrounds, or decorative elements — the PNG supplies all artwork.
export default function CertificateStaticOverlay({ data }: { data: CertificateData }) {
  const churchName = data.churchName || "LIGHTHOUSE BAPTIST CHURCH";
  const cfg        = TYPE_CONFIG[data.certType] ?? DEFAULT_CONFIG;
  const blessing   = data.blessing || cfg.blessing;
  const isPurple   = data.template === "purple";
  const isClassic  = data.template === "white";

  // Premium artwork is denser → slightly smaller type so text breathes.
  // Classic/traditional backgrounds are lighter → can carry slightly larger type.
  const sz = {
    church:    isClassic ? "13px" : "12px",
    title:     isClassic ? "52px" : "44px",
    subtitle:  isClassic ? "12px" : "11px",
    body:      isClassic ? "14px" : "13px",
    childName: isClassic ? "60px" : "52px",
    blessing:  isClassic ? "16px" : "15px",
    footer:    isClassic ? "12px" : "11px",
    minister:  isClassic ? "24px" : "22px",
  };

  const textColor  = isPurple ? "#ffffff"                          : "#2B1A09";
  const gold       = "#D4AF37";

  // Strong shadows ensure legibility over both dark (premium) and light (classic) backgrounds.
  const shadow     = isPurple
    ? "0 1px 5px rgba(0,0,0,.95), 0 0 2px #000"
    : "0 1px 2px rgba(255,255,255,.85), 0 0 5px rgba(255,255,255,.6)";

  const goldShadow = isPurple
    ? "0 1px 0 #7c5607, 0 3px 8px rgba(0,0,0,.75), 0 0 10px rgba(212,175,55,.2)"
    : "0 1px 0 #8b6508, 0 3px 6px rgba(0,0,0,.3)";

  const nameShadow = isPurple
    ? "0 1px 0 #7c5607, 0 3px 7px rgba(0,0,0,.8)"
    : "0 1px 0 #7c5607, 0 3px 5px rgba(0,0,0,.35)";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* ── Church name — 25 % from top ──────────────────────────────────── */}
      <div style={{
        ...center("25%"),
        fontFamily:    "Georgia, serif",
        fontSize:      sz.church,
        letterSpacing: ".22em",
        textTransform: "uppercase",
        whiteSpace:    "nowrap",
        color:         textColor,
        textShadow:    shadow,
      }}>
        {churchName}
      </div>

      {/* ── Certificate title — 37 % from top ───────────────────────────── */}
      <div style={{
        ...center("37%"),
        fontFamily:  "Brush Script MT, Segoe Script, cursive",
        fontSize:    sz.title,
        lineHeight:  1,
        color:       gold,
        textShadow:  goldShadow,
        maxWidth:    "58%",
        whiteSpace:  "nowrap",
      }}>
        {cfg.title}
      </div>

      {/* ── Subtitle — 49 % from top ─────────────────────────────────────── */}
      <div style={{
        ...center("49%"),
        fontFamily:    "Georgia, serif",
        fontSize:      sz.subtitle,
        letterSpacing: ".10em",
        whiteSpace:    "nowrap",
        color:         textColor,
        textShadow:    shadow,
      }}>
        {cfg.subtitle}
      </div>

      {/* ── Body text — 54 % from top ────────────────────────────────────── */}
      <div style={{
        ...center("54%"),
        fontFamily:  "Georgia, serif",
        fontSize:    sz.body,
        lineHeight:  1.5,
        width:       "52%",
        color:       textColor,
        textShadow:  shadow,
      }}>
        {cfg.body.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </div>

      {/* ── Child name — 63 % from top ───────────────────────────────────── */}
      <div style={{
        ...center("63%"),
        fontFamily:  "Brush Script MT, Segoe Script, cursive",
        fontSize:    sz.childName,
        lineHeight:  1,
        color:       gold,
        textShadow:  nameShadow,
        maxWidth:    "68%",
        whiteSpace:  "nowrap",
      }}>
        {data.childName}
      </div>

      {/* ── Blessing — 73 % from top ─────────────────────────────────────── */}
      <div style={{
        ...center("73%"),
        fontFamily:  "Georgia, serif",
        fontSize:    sz.blessing,
        lineHeight:  1.35,
        width:       "66%",
        color:       gold,
        textShadow:  goldShadow,
      }}>
        {blessing}
      </div>

      {/* ── Footer — 86 % from top ───────────────────────────────────────── */}
      {/* Three columns: date | scripture reference | minister */}
      <div style={{
        position:        "absolute",
        top:             "86%",
        left:            "7%",
        right:           "7%",
        display:         "flex",
        justifyContent:  "space-between",
        alignItems:      "flex-start",
        fontFamily:      "Georgia, serif",
        fontSize:        sz.footer,
        color:           textColor,
      }}>

        {/* Date */}
        <div style={{ textAlign: "center", minWidth: "120px" }}>
          <div style={{ textShadow: shadow }}>
            {data.date || "April 14, 2026"}
          </div>
          <div style={{
            marginTop:     "4px",
            fontSize:      "10px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity:       0.75,
            textShadow:    shadow,
          }}>
            Date
          </div>
        </div>

        {/* Scripture reference (center) — only the citation, not the full verse */}
        {data.reference && (
          <div style={{ textAlign: "center", flex: "0 0 auto" }}>
            <div style={{
              fontSize:      "10px",
              letterSpacing: ".10em",
              textTransform: "uppercase",
              color:         gold,
              fontWeight:    700,
              textShadow:    goldShadow,
            }}>
              {data.reference}
            </div>
          </div>
        )}

        {/* Minister */}
        <div style={{ textAlign: "center", minWidth: "120px" }}>
          <div style={{
            fontFamily:  "Brush Script MT, Segoe Script, cursive",
            fontSize:    sz.minister,
            lineHeight:  1,
            color:       isPurple ? "#F7F0DD" : textColor,
            textShadow:  isPurple ? "0 2px 8px rgba(0,0,0,.85)" : shadow,
          }}>
            {data.ministerName || "Children’s Ministry"}
          </div>
          <div style={{
            marginTop:     "4px",
            fontSize:      "10px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity:       0.75,
            textShadow:    shadow,
          }}>
            {data.ministerTitle || "Director"}
          </div>
        </div>

      </div>
    </div>
  );
}
