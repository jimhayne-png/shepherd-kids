"use client";

import type React from "react";
import type { CertificateData } from "../types";

const TYPE_CONFIG: Record<
  string,
  { title: string; subtitle: string; body: string; blessing: string }
> = {
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

function center(top: string): React.CSSProperties {
  return {
    position: "absolute",
    top,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
  };
}

export default function CertificateStaticOverlay({
  data,
}: {
  data: CertificateData;
}) {
  const churchName = data.churchName || "LIGHTHOUSE BAPTIST CHURCH";
  const cfg = TYPE_CONFIG[data.certType] ?? DEFAULT_CONFIG;
  const blessing = data.blessing || cfg.blessing;

  const isPurple = data.template === "purple";
  const isClassic = data.template === "white";

  const sz = {
    church: isClassic ? "13px" : "12px",
    title: isClassic ? "46px" : "39px",
    subtitle: isClassic ? "12px" : "11px",
    body: isClassic ? "14px" : "13px",
    childName: isClassic ? "48px" : "42px",
    blessing: isClassic ? "15px" : "14px",
    footer: isClassic ? "12px" : "11px",
    minister: isClassic ? "22px" : "20px",
  };

  const textColor = isPurple ? "#ffffff" : "#2B1A09";
  const gold = "#D4AF37";

  const shadow = isPurple
    ? "0 1px 5px rgba(0,0,0,.95), 0 0 2px #000"
    : "0 1px 2px rgba(255,255,255,.85), 0 0 5px rgba(255,255,255,.6)";

  const goldShadow = isPurple
    ? "0 1px 0 #7c5607, 0 3px 8px rgba(0,0,0,.75), 0 0 10px rgba(212,175,55,.2)"
    : "0 1px 0 #8b6508, 0 3px 6px rgba(0,0,0,.3)";

  const nameShadow = isPurple
    ? "0 1px 0 #7c5607, 0 3px 7px rgba(0,0,0,.8)"
    : "0 1px 0 #7c5607, 0 3px 5px rgba(0,0,0,.35)";

  const scriptFont = `"Segoe Script", "Brush Script MT", cursive`;
  const serifFont = `"Georgia", "Times New Roman", serif`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Church name — moved much higher */}
      <div
        style={{
          ...center("8%"),
          fontFamily: serifFont,
          fontSize: sz.church,
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

      {/* Certificate title */}
      <div
        style={{
          ...center("29.5%"),
          fontFamily: scriptFont,
          fontSize: sz.title,
          lineHeight: 0.92,
          color: gold,
          textShadow: goldShadow,
          maxWidth: "58%",
          whiteSpace: "nowrap",
        }}
      >
        {cfg.title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          ...center("38.5%"),
          fontFamily: serifFont,
          fontSize: sz.subtitle,
          lineHeight: 1.1,
          letterSpacing: ".10em",
          whiteSpace: "nowrap",
          color: textColor,
          textShadow: shadow,
        }}
      >
        {cfg.subtitle}
      </div>

      {/* Body text */}
      <div
        style={{
          ...center("45%"),
          fontFamily: serifFont,
          fontSize: sz.body,
          lineHeight: 1.42,
          width: "52%",
          color: textColor,
          textShadow: shadow,
        }}
      >
        {cfg.body.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>

      {/* Child name */}
      <div
        style={{
          ...center("56.5%"),
          fontFamily: scriptFont,
          fontSize: sz.childName,
          lineHeight: 0.9,
          color: gold,
          textShadow: nameShadow,
          maxWidth: "66%",
          whiteSpace: "nowrap",
        }}
      >
        {data.childName}
      </div>

      {/* Blessing */}
      <div
        style={{
          ...center("64.5%"),
          fontFamily: serifFont,
          fontSize: sz.blessing,
          lineHeight: 1.28,
          width: "62%",
          color: gold,
          textShadow: goldShadow,
        }}
      >
        {blessing}
      </div>

      {/* Date */}
      <div
        style={{
          position: "absolute",
          top: "81%",
          left: "8.5%",
          width: "22%",
          textAlign: "center",
          fontFamily: serifFont,
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
            fontSize: "10px",
            lineHeight: 1,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity: 0.75,
            textShadow: shadow,
          }}
        >
          Date
        </div>
      </div>

      {/* Scripture reference */}
      {data.reference && (
        <div
          style={{
            position: "absolute",
            top: "86%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "28%",
            textAlign: "center",
            fontFamily: serifFont,
            fontSize: "10px",
            lineHeight: 1.1,
            letterSpacing: ".10em",
            textTransform: "uppercase",
            color: gold,
            fontWeight: 700,
            textShadow: goldShadow,
            whiteSpace: "nowrap",
          }}
        >
          {data.reference}
        </div>
      )}

      {/* Minister */}
      <div
        style={{
          position: "absolute",
          top: "79.8%",
          right: "8.5%",
          width: "24%",
          textAlign: "center",
          fontFamily: serifFont,
          fontSize: sz.footer,
          color: textColor,
        }}
      >
        <div
          style={{
            fontFamily: scriptFont,
            fontSize: sz.minister,
            lineHeight: 0.95,
            color: isPurple ? "#F7F0DD" : textColor,
            textShadow: isPurple ? "0 2px 8px rgba(0,0,0,.85)" : shadow,
            whiteSpace: "nowrap",
          }}
        >
          {data.ministerName || "Children’s Ministry"}
        </div>
        <div
          style={{
            marginTop: "5px",
            fontSize: "10px",
            lineHeight: 1,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity: 0.75,
            textShadow: shadow,
          }}
        >
          {data.ministerTitle || "Director"}
        </div>
      </div>
    </div>
  );
}