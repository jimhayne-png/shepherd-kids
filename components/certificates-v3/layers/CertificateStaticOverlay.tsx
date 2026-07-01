"use client";

import type React from "react";
import type { CertificateData } from "../types";
import { Cinzel, Great_Vibes } from "next/font/google";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
});

type CertificateTypeConfig = {
  title: string;
  subtitle: string;
  bodyLines: string[];
  blessingLines: string[];
};

const TYPE_CONFIG: Record<string, CertificateTypeConfig> = {
  birthday: {
    title: "Happy Birthday!",
    subtitle: "CELEBRATING GOD'S AMAZING GIFT OF YOU",
    bodyLines: [
      "This certificate celebrates",
      "the wonderful gift of you",
      "and the joy you bring to our church family.",
    ],
    blessingLines: [
      "May God bless you today and always",
      "as you grow in His love!",
    ],
  },
  spiritual_birthday: {
    title: "Spiritual Birthday!",
    subtitle: "THE DAY YOU GAVE YOUR HEART TO JESUS",
    bodyLines: [
      "This certificate honors the most important",
      "decision of your life — choosing to follow",
      "Jesus Christ as Lord.",
    ],
    blessingLines: [
      "May you grow in faith, love, and wisdom",
      "as you walk with the Lord.",
    ],
  },
  baptism: {
    title: "Baptized!",
    subtitle: "FOLLOWING JESUS IN BELIEVER'S BAPTISM",
    bodyLines: [
      "This certificate celebrates your public",
      "declaration of faith through",
      "the waters of baptism.",
    ],
    blessingLines: [
      "May your baptism be a reminder",
      "of the new life you have in Christ.",
    ],
  },
  faith_milestone: {
    title: "Faith Milestone!",
    subtitle: "GROWING IN FAITH AND KNOWLEDGE",
    bodyLines: [
      "This certificate recognizes",
      "a meaningful step forward",
      "in your faith journey with Jesus.",
    ],
    blessingLines: [
      "May God continue to guide your steps",
      "as you grow in His grace.",
    ],
  },
  scripture_memory: {
    title: "Scripture Memory!",
    subtitle: "HIDING GOD'S WORD IN YOUR HEART",
    bodyLines: [
      "This certificate honors your commitment",
      "to memorizing and treasuring",
      "the Word of God.",
    ],
    blessingLines: [
      "May God's Word be a lamp unto your feet",
      "and a light unto your path.",
    ],
  },
  attendance: {
    title: "Faithful Attendance!",
    subtitle: "FAITHFUL AND PRESENT",
    bodyLines: [
      "This certificate celebrates",
      "your faithful presence and commitment",
      "to our church family.",
    ],
    blessingLines: [
      "May your faithfulness be a blessing",
      "to all who know you.",
    ],
  },
  promotion: {
    title: "Promotion Sunday!",
    subtitle: "MOVING FORWARD IN FAITH",
    bodyLines: [
      "This certificate recognizes your growth",
      "and readiness to take your next step",
      "in ministry.",
    ],
    blessingLines: [
      "May God lead you forward",
      "with courage, joy, and faith.",
    ],
  },
  servant_heart: {
    title: "Servant Heart!",
    subtitle: "FOLLOWING JESUS BY SERVING OTHERS",
    bodyLines: [
      "This certificate honors",
      "the servant heart you have shown",
      "to our church family and beyond.",
    ],
    blessingLines: [
      "May you always find joy",
      "in serving others as Jesus served us.",
    ],
  },
  kindness: {
    title: "Kindness Award!",
    subtitle: "LOVING OTHERS AS JESUS LOVES US",
    bodyLines: [
      "This certificate celebrates",
      "the kindness and love you have shown",
      "to those around you.",
    ],
    blessingLines: [
      "May your kindness be a light",
      "that leads others to Christ.",
    ],
  },
  helper: {
    title: "Helper Award!",
    subtitle: "A HELPING HAND FOR GOD'S GLORY",
    bodyLines: [
      "This certificate honors your willingness",
      "to help and serve",
      "with a joyful heart.",
    ],
    blessingLines: [
      "May God bless every act of help",
      "and service you offer in His name.",
    ],
  },
};

const DEFAULT_CONFIG: CertificateTypeConfig = {
  title: "Well Done!",
  subtitle: "A SPECIAL RECOGNITION",
  bodyLines: [
    "This certificate celebrates",
    "a meaningful achievement",
    "in your faith journey.",
  ],
  blessingLines: [
    "May God's blessings follow you",
    "all the days of your life.",
  ],
};

function center(top: string): React.CSSProperties {
  return {
    position: "absolute",
    top,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
  };
}

function renderLines(lines: string[]) {
  return lines.map((line, i) => (
    <span key={`${line}-${i}`}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function splitCustomText(text: string): string[] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

export default function CertificateStaticOverlay({
  data,
}: {
  data: CertificateData;
}) {
  const churchName = data.churchName || "LIGHTHOUSE BAPTIST CHURCH";
  const cfg = TYPE_CONFIG[data.certType] ?? DEFAULT_CONFIG;

  const blessingLines = data.blessing
    ? splitCustomText(data.blessing)
    : cfg.blessingLines;

  const isPremium = data.template === "premium";
  const isClassic = data.template === "classic";

  const sz = {
    church: isClassic ? "13px" : "12px",
    title: isClassic ? "48px" : "43px",
    subtitle: isClassic ? "12px" : "11px",
    body: isClassic ? "14px" : "13px",
    childName: isClassic ? "44px" : "40px",
    blessing: isClassic ? "15px" : "14px",
    footer: isClassic ? "12px" : "11px",
    minister: isClassic ? "16px" : "15px",
  };

  const textColor = isPremium ? "#ffffff" : "#2B1A09";
  const gold = "#D4AF37";

  const shadow = isPremium
    ? "0 1px 5px rgba(0,0,0,.95), 0 0 2px #000"
    : "0 1px 2px rgba(255,255,255,.85), 0 0 5px rgba(255,255,255,.6)";

  const goldShadow = isPremium
    ? "0 1px 0 #7c5607, 0 3px 8px rgba(0,0,0,.75), 0 0 10px rgba(212,175,55,.2)"
    : "0 1px 0 #8b6508, 0 3px 6px rgba(0,0,0,.3)";

  const nameShadow = isPremium
    ? "0 1px 0 #7c5607, 0 3px 7px rgba(0,0,0,.8)"
    : "0 1px 0 #7c5607, 0 3px 5px rgba(0,0,0,.35)";

  const scriptFont = greatVibes.style.fontFamily;
  const serifFont = cinzel.style.fontFamily;
  const bodyFont = `"Georgia", "Times New Roman", serif`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...center("12%"),
          fontFamily: serifFont,
          fontSize: sz.church,
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: ".24em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: textColor,
          textShadow: shadow,
        }}
      >
        {churchName}
      </div>

      <div
        style={{
          ...center("16%"),
          fontFamily: scriptFont,
          fontSize: sz.title,
          lineHeight: 0.95,
          color: gold,
          textShadow: goldShadow,
          maxWidth: "68%",
          whiteSpace: "nowrap",
        }}
      >
        {cfg.title}
      </div>

      <div
        style={{
          ...center("28%"),
          fontFamily: serifFont,
          fontSize: sz.subtitle,
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: ".10em",
          whiteSpace: "nowrap",
          color: textColor,
          textShadow: shadow,
        }}
      >
        {cfg.subtitle}
      </div>

      <div
        style={{
          ...center("34%"),
          fontFamily: bodyFont,
          fontSize: sz.body,
          lineHeight: 1.28,
          width: "58%",
          color: textColor,
          textShadow: shadow,
        }}
      >
        {renderLines(cfg.bodyLines)}
      </div>

      <div
        style={{
          ...center("52%"),
          fontFamily: scriptFont,
          fontSize: sz.childName,
          lineHeight: 0.95,
          color: gold,
          textShadow: nameShadow,
          maxWidth: "70%",
          whiteSpace: "nowrap",
        }}
      >
        {data.childName}
      </div>

      <div
        style={{
          ...center("62%"),
          fontFamily: bodyFont,
          fontSize: sz.blessing,
          fontWeight: 700,
          lineHeight: 1.28,
          width: "66%",
          color: gold,
          textShadow: goldShadow,
        }}
      >
        {renderLines(blessingLines)}
      </div>

      {data.reference && (
        <div
          style={{
            position: "absolute",
            top: "78%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "28%",
            textAlign: "center",
            fontFamily: serifFont,
            fontSize: "9px",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: ".10em",
            textTransform: "uppercase",
            color: gold,
            textShadow: goldShadow,
            whiteSpace: "nowrap",
          }}
        >
          {data.reference}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "82%",
          left: "8.5%",
          width: "22%",
          textAlign: "center",
          fontFamily: bodyFont,
          fontSize: sz.footer,
          color: textColor,
        }}
      >
        <div style={{ lineHeight: 1.1, textShadow: shadow }}>
          {data.date || "April 14, 2026"}
        </div>
        <div
          style={{
            marginTop: "4px",
            fontFamily: serifFont,
            fontSize: "10px",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity: 0.9,
            textShadow: shadow,
          }}
        >
          Date
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "82%",
          right: "5.5%",
          width: "34%",
          textAlign: "center",
          fontFamily: serifFont,
          fontSize: sz.footer,
          color: textColor,
        }}
      >
        <div
          style={{
            fontFamily: serifFont,
            fontSize: sz.minister,
            fontWeight: 500,
            lineHeight: 1.05,
            color: isPremium ? "#F7F0DD" : textColor,
            textShadow: isPremium ? "0 2px 8px rgba(0,0,0,.85)" : shadow,
            whiteSpace: "nowrap",
          }}
        >
          {data.ministerName || "Children’s Ministry"}
        </div>

        <div
          style={{
            marginTop: "5px",
            fontFamily: serifFont,
            fontSize: "10px",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: ".05em",
            textTransform: "none",
            opacity: 0.9,
            textShadow: shadow,
            whiteSpace: "nowrap",
          }}
        >
          {data.ministerTitle || "Children’s Ministry Director"}
        </div>
      </div>
    </div>
  );
}