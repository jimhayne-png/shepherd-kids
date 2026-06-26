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

// Text-only overlay for static background certificates.
// Contains NO CSS artwork: no plaque boxes, no borders, no gradient lines,
// no decorative dividers. The static background image supplies all artwork.
export default function CertificateStaticOverlay({ data }: { data: CertificateData }) {
  const churchName = data.churchName || "LIGHTHOUSE BAPTIST CHURCH";
  const cfg = TYPE_CONFIG[data.certType] ?? DEFAULT_CONFIG;
  const blessing = data.blessing || cfg.blessing;
  const isPurple = data.template === "purple";

  const shadow = isPurple
    ? "0 1px 6px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,1)"
    : "0 1px 3px rgba(255,255,255,.8), 0 0 6px rgba(255,255,255,.6)";

  const goldShadow = isPurple
    ? "0 2px 0 #8b6508, 0 5px 10px rgba(0,0,0,.7), 0 0 14px rgba(212,175,55,.25)"
    : "0 2px 0 #8b6508, 0 5px 10px rgba(0,0,0,.35), 0 0 14px rgba(212,175,55,.18)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "grid",
        gridTemplateRows: "82px 34px 48px 106px 48px 72px 88px 46px 94px 88px",
        justifyItems: "center",
        alignItems: "center",
        color: isPurple ? "#fff" : "#2B1A09",
      }}
    >
      {/* Row 3: church name */}
      <div
        style={{
          gridRow: 3,
          marginTop: "4px",
          fontFamily: "Georgia, serif",
          fontSize: "15px",
          letterSpacing: ".24em",
          color: isPurple ? "rgba(255,255,255,.96)" : "rgba(43,26,9,.88)",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: shadow,
        }}
      >
        {churchName}
      </div>

      {/* Row 4: certificate title */}
      <div
        style={{
          gridRow: 4,
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: "94px",
          lineHeight: ".84",
          color: "#D4AF37",
          textShadow: goldShadow,
          transform: "rotate(-1deg)",
        }}
      >
        {cfg.title}
      </div>

      {/* Row 5: subtitle — text only, no decorative lines */}
      <div
        style={{
          gridRow: 5,
          whiteSpace: "nowrap",
          fontFamily: "Georgia, serif",
          fontSize: "17px",
          letterSpacing: ".11em",
          textShadow: shadow,
        }}
      >
        {cfg.subtitle}
      </div>

      {/* Row 6: body text */}
      <div
        style={{
          gridRow: 6,
          width: "54%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: "16px",
          lineHeight: 1.48,
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

      {/* Row 7: child name */}
      <div
        style={{
          gridRow: 7,
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: "84px",
          lineHeight: ".86",
          color: "#D4AF37",
          textShadow: isPurple
            ? "0 2px 0 #7c5607, 0 4px 8px rgba(0,0,0,.7)"
            : "0 2px 0 #7c5607, 0 4px 8px rgba(0,0,0,.4)",
        }}
      >
        {data.childName}
      </div>

      {/* Row 8: blessing */}
      <div
        style={{
          gridRow: 8,
          width: "74%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: "#D4AF37",
          lineHeight: 1.25,
          marginTop: "-10px",
          textShadow: goldShadow,
        }}
      >
        {blessing}
      </div>

      {/* Row 9: footer — date | scripture | minister */}
      <div
        style={{
          gridRow: 9,
          width: "90%",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "end",
          columnGap: 20,
          marginTop: "18px",
          transform: "translateY(6px)",
        }}
      >
        {/* Date column */}
        <div style={{ justifySelf: "center", textAlign: "center", minWidth: 180 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "18px",
              color: isPurple ? "#ffffff" : "#2B1A09",
              letterSpacing: ".02em",
              paddingBottom: 6,
              textShadow: shadow,
            }}
          >
            {data.date || "April 14, 2026"}
          </div>
          <div
            style={{
              marginTop: 5,
              fontFamily: "Georgia, serif",
              fontSize: "12px",
              letterSpacing: ".18em",
              color: isPurple ? "rgba(255,255,255,.92)" : "rgba(43,26,9,.74)",
              textTransform: "uppercase",
              textShadow: shadow,
            }}
          >
            Date
          </div>
        </div>

        {/* Scripture — center, inline text */}
        {(data.verse || data.reference) && (
          <div
            style={{
              textAlign: "center",
              maxWidth: 220,
              fontFamily: "Georgia, serif",
            }}
          >
            {data.verse && (
              <div
                style={{
                  fontSize: "11px",
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  color: isPurple ? "rgba(255,255,255,.88)" : "rgba(43,26,9,.78)",
                  textShadow: shadow,
                }}
              >
                &ldquo;{data.verse}&rdquo;
              </div>
            )}
            {data.reference && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: "10px",
                  letterSpacing: ".10em",
                  textTransform: "uppercase",
                  color: "#D4AF37",
                  fontWeight: 700,
                  textShadow: goldShadow,
                }}
              >
                {data.reference}
              </div>
            )}
          </div>
        )}

        {/* Minister column */}
        <div style={{ justifySelf: "center", textAlign: "center", minWidth: 220 }}>
          <div
            style={{
              fontFamily: "Brush Script MT, Segoe Script, cursive",
              fontSize: "28px",
              lineHeight: 1,
              color: isPurple ? "#F7F0DD" : "#2B1A09",
              paddingBottom: 5,
              textShadow: isPurple ? "0 2px 8px rgba(0,0,0,.8)" : shadow,
            }}
          >
            {data.ministerName || "Children’s Ministry"}
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: "Georgia, serif",
              fontSize: "12px",
              letterSpacing: ".18em",
              color: isPurple ? "rgba(255,255,255,.92)" : "rgba(43,26,9,.74)",
              textTransform: "uppercase",
              textShadow: shadow,
            }}
          >
            {data.ministerTitle || "Director"}
          </div>
        </div>
      </div>
    </div>
  );
}
