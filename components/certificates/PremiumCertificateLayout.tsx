"use client";

import type { CSSProperties, ReactNode } from "react";
import type { CertificateTemplate } from "@/lib/certificates/themes";

type Side = "left" | "right";

export interface PremiumCertificateLayoutProps {
  template: CertificateTemplate;
  churchName: string;
  churchTagline?: string;
  logoUrl?: string;
  certificateTitle: string;
  certificateSubtitle?: string;
  childName: string;
  verse: string;
  reference: string;
  translation: "kjv" | "niv";
  blessing?: string;
  ministerName: string;
  ministerTitle: string;
  date: string;
  sealImageUrl?: string;
  renderMotif?: (side: Side) => ReactNode;
}

const GOLD = "#D4AF37";
const LIGHT_GOLD = "#F8E6A0";
const DEEP_PURPLE = "#1C0A30";

function formatDate(value: string) {
  if (!value) return "";
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

function Corner({ position, ivory }: { position: "tl" | "tr" | "bl" | "br"; ivory: boolean }) {
  const placement: Record<typeof position, CSSProperties> = {
    tl: { top: 20, left: 20 },
    tr: { top: 20, right: 20, transform: "scaleX(-1)" },
    bl: { bottom: 20, left: 20, transform: "scaleY(-1)" },
    br: { bottom: 20, right: 20, transform: "scale(-1)" },
  };

  const stroke = ivory ? "#8B6914" : GOLD;
  const shine = ivory ? "#C89B2C" : LIGHT_GOLD;

  return (
    <svg viewBox="0 0 150 150" style={{ position: "absolute", width: 138, height: 138, zIndex: 8, ...placement[position] }}>
      <path d="M13 137V13h124" fill="none" stroke={stroke} strokeWidth="5" />
      <path d="M28 122V28h94" fill="none" stroke={shine} strokeWidth="1.8" opacity=".85" />
      <path
        d="M36 36c30 5 39 31 15 49 34-5 52 16 45 50M47 29c-6 31 18 44 46 31M29 96c25-9 45 3 55 29"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".9"
      />
      <circle cx="61" cy="61" r="6" fill={shine} />
      <path d="M84 31l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={shine} opacity=".92" />
    </svg>
  );
}

function MinistrySeal({ ivory, sealImageUrl }: { ivory: boolean; sealImageUrl?: string }) {
  if (sealImageUrl) {
    return (
      <img
        src={sealImageUrl}
        alt=""
        style={{
          width: 104,
          height: 104,
          objectFit: "contain",
          borderRadius: "50%",
          padding: 8,
          background: ivory ? "#FFF8E3" : "#12031D",
          border: `3px solid ${ivory ? "#8B6914" : LIGHT_GOLD}`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 106,
        height: 106,
        borderRadius: "50%",
        background: ivory
          ? "radial-gradient(circle, #FFF8DB 0%, #D4AF37 48%, #76530F 100%)"
          : "radial-gradient(circle, #FFF0A8 0%, #D4AF37 45%, #6B4200 100%)",
        border: ivory ? "3px solid #8B6914" : "3px solid #F8E6A0",
        boxShadow: ivory ? "0 6px 18px rgba(0,0,0,.20)" : "0 0 30px rgba(212,175,55,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 9,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "1.5px solid rgba(45,20,70,.72)",
          background: ivory
            ? "radial-gradient(circle at 50% 38%, #FFF9E8 0%, #F2DB9A 56%, #8B6914 100%)"
            : "radial-gradient(circle at 50% 38%, #2A0D43 0%, #16051F 58%, #07020D 100%)",
          color: ivory ? "#5E4210" : LIGHT_GOLD,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          boxShadow: ivory ? "inset 0 0 18px rgba(139,105,20,.14)" : "inset 0 0 22px rgba(212,175,55,.10)",
        }}
      >
        <svg viewBox="0 0 90 90" aria-hidden="true" style={{ width: 72, height: 72 }}>
          <circle cx="45" cy="45" r="34" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".72" />
          <path d="M45 20v39M32 35h26" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M25 62c10 8 30 8 40 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".78" />
          <path d="M28 68c8 5 26 5 34 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
        </svg>
      </div>
    </div>
  );
}

export default function PremiumCertificateLayout(props: PremiumCertificateLayoutProps) {
  const ivory = props.template === "white";
  const displayDate = formatDate(props.date);
  const nameSize = props.childName.length > 24 ? 92 : props.childName.length > 16 ? 106 : 116;

  const background = ivory
    ? `
      radial-gradient(circle at 50% 28%, rgba(255,255,255,.96) 0%, rgba(253,250,239,.98) 42%, rgba(234,214,165,.98) 100%),
      radial-gradient(circle at 8% 10%, rgba(212,175,55,.10), transparent 25%),
      radial-gradient(circle at 92% 10%, rgba(123,44,191,.08), transparent 24%),
      repeating-linear-gradient(45deg, rgba(139,105,20,.035) 0px, rgba(139,105,20,.035) 1px, transparent 1px, transparent 10px)
    `
    : `
      radial-gradient(circle at 50% 6%, rgba(255,235,150,.20) 0%, transparent 18%),
      radial-gradient(circle at 50% 18%, rgba(123,44,191,.36) 0%, rgba(28,10,48,.68) 35%, rgba(5,2,18,.98) 100%),
      radial-gradient(circle at 12% 78%, rgba(123,44,191,.18), transparent 34%),
      radial-gradient(circle at 88% 78%, rgba(212,175,55,.07), transparent 28%),
      repeating-radial-gradient(circle at 50% 35%, transparent 0, transparent 13px, rgba(212,175,55,.022) 14px, transparent 16px),
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
        boxSizing: "border-box",
        border: ivory ? "6px solid #8B6914" : `6px solid ${GOLD}`,
        boxShadow: ivory ? "0 12px 34px rgba(0,0,0,.18)" : "0 18px 52px rgba(0,0,0,.58)",
        color: ivory ? DEEP_PURPLE : "#FFFFFF",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: ivory
            ? `
              radial-gradient(circle at 50% 36%, rgba(255,255,255,.52), transparent 34%),
              radial-gradient(circle at 15% 12%, rgba(212,175,55,.14), transparent 22%),
              radial-gradient(circle at 86% 16%, rgba(123,44,191,.08), transparent 25%),
              radial-gradient(circle at 50% 104%, rgba(139,105,20,.10), transparent 36%)
            `
            : `
              radial-gradient(circle at 50% 32%, rgba(255,235,170,.11), transparent 34%),
              radial-gradient(circle at 50% 8%, rgba(255,240,170,.12), transparent 22%),
              radial-gradient(circle at 16% 82%, rgba(123,44,191,.22), transparent 36%),
              radial-gradient(circle at 88% 78%, rgba(212,175,55,.10), transparent 30%),
              radial-gradient(circle at 50% 50%, transparent 44%, rgba(0,0,0,.30) 100%)
            `,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          opacity: ivory ? 0.18 : 0.34,
          backgroundImage: ivory
            ? `
              radial-gradient(circle at 16% 22%, rgba(139,105,20,.35) 0 1px, transparent 1.5px),
              radial-gradient(circle at 72% 18%, rgba(212,175,55,.30) 0 1px, transparent 1.5px),
              radial-gradient(circle at 88% 72%, rgba(139,105,20,.22) 0 1px, transparent 1.5px)
            `
            : `
              radial-gradient(circle at 18% 24%, rgba(248,230,160,.55) 0 1px, transparent 1.7px),
              radial-gradient(circle at 36% 18%, rgba(123,44,191,.55) 0 1px, transparent 1.8px),
              radial-gradient(circle at 78% 22%, rgba(212,175,55,.50) 0 1px, transparent 1.7px),
              radial-gradient(circle at 86% 72%, rgba(248,230,160,.35) 0 1px, transparent 1.8px),
              radial-gradient(circle at 24% 82%, rgba(123,44,191,.45) 0 1px, transparent 1.8px)
            `,
          backgroundSize: "180px 140px, 260px 190px, 220px 170px, 300px 210px, 240px 180px",
        }}
      />

      <div style={{ position: "absolute", inset: 14, border: ivory ? `2px solid ${GOLD}` : "2px solid #F8E6A0", zIndex: 5 }} />
      <div style={{ position: "absolute", inset: 28, border: ivory ? "1px solid rgba(139,105,20,.48)" : "1px solid rgba(212,175,55,.42)", zIndex: 5 }} />
      <div style={{ position: "absolute", inset: 44, border: ivory ? "1px solid rgba(139,105,20,.22)" : "1px solid rgba(212,175,55,.16)", zIndex: 5 }} />

      <Corner position="tl" ivory={ivory} />
      <Corner position="tr" ivory={ivory} />
      <Corner position="bl" ivory={ivory} />
      <Corner position="br" ivory={ivory} />

      {props.renderMotif ? (
        <>
          <div style={{ position: "absolute", left: -82, top: 80, zIndex: 4, pointerEvents: "none", opacity: ivory ? 0.70 : 0.82 }}>
            {props.renderMotif("left")}
          </div>
          <div style={{ position: "absolute", right: -82, top: 80, zIndex: 4, pointerEvents: "none", opacity: ivory ? 0.70 : 0.82 }}>
            {props.renderMotif("right")}
          </div>
        </>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          fontFamily: "Georgia, serif",
          fontSize: ivory ? 34 : 42,
          color: ivory ? "#B8860B" : "#FFF2B8",
          lineHeight: 1,
          textShadow: ivory ? "0 0 10px rgba(184,134,11,.18)" : "0 0 10px rgba(255,240,170,.72), 0 0 32px rgba(212,175,55,.22)",
        }}
      >
        ✝
      </div>

      <div
        style={{
          position: "absolute",
          top: 78,
          left: "50%",
          transform: "translateX(-50%)",
          width: 620,
          zIndex: 20,
          textAlign: "center",
        }}
      >

        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 25,
            fontWeight: 900,
            letterSpacing: ".13em",
            textTransform: "uppercase",
            color: ivory ? DEEP_PURPLE : LIGHT_GOLD,
            textShadow: ivory ? "0 1px 0 #FFF" : "0 2px 0 rgba(0,0,0,.45)",
          }}
        >
          {props.churchName}
        </div>

        {props.churchTagline ? (
          <div
            style={{
              marginTop: 7,
              fontFamily: "Georgia, serif",
              fontSize: 13,
              fontStyle: "italic",
              letterSpacing: ".055em",
              color: ivory ? "#7B5B17" : "rgba(248,230,160,.82)",
            }}
          >
            {props.churchTagline}
          </div>
        ) : null}

        <div
          style={{
            margin: "15px auto 0",
            width: 360,
            height: 1,
            background: ivory
              ? "linear-gradient(90deg, transparent, rgba(139,105,20,.45), transparent)"
              : "linear-gradient(90deg, transparent, rgba(212,175,55,.42), transparent)",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 206,
          left: "50%",
          transform: "translateX(-50%)",
          width: "82%",
          zIndex: 20,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: ".055em",
            color: ivory ? "#3D145F" : GOLD,
            textShadow: ivory ? "0 1px 0 #FFF" : "0 2px 0 rgba(0,0,0,.55), 0 0 22px rgba(212,175,55,.18)",
          }}
        >
          {props.certificateTitle}
        </div>

        {props.certificateSubtitle ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: "Georgia, serif",
              fontSize: 17,
              fontStyle: "italic",
              letterSpacing: ".06em",
              color: ivory ? "#7B5B17" : "#F8E6A0",
            }}
          >
            {props.certificateSubtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          top: 346,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 22,
          width: "82%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: nameSize,
          fontWeight: 900,
          fontStyle: "italic",
          lineHeight: 0.95,
          letterSpacing: ".015em",
          color: ivory ? "#2A0D43" : "#FFF0B8",
          textShadow: ivory ? "0 1px 0 #FFF" : "0 4px 0 rgba(0,0,0,.55), 0 0 42px rgba(212,175,55,.30), 0 0 80px rgba(255,240,170,.12)",
        }}
      >
        {props.childName}
      </div>

      {props.blessing ? (
        <div
          style={{
            position: "absolute",
            top: 482,
            left: "50%",
            transform: "translateX(-50%)",
            width: 720,
            zIndex: 20,
            textAlign: "center",
            fontFamily: "Georgia, serif",
            fontSize: 16,
            lineHeight: 1.46,
            fontStyle: "italic",
            color: ivory ? "#4E3B2A" : "rgba(255,255,255,.84)",
          }}
        >
          {props.blessing}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: props.blessing ? 552 : 520,
          left: "50%",
          transform: "translateX(-50%)",
          width: 720,
          minHeight: 118,
          zIndex: 20,
          background: ivory
            ? "linear-gradient(180deg, rgba(255,252,240,.96), rgba(238,214,162,.88))"
            : "linear-gradient(180deg, rgba(42,13,64,.96), rgba(18,5,31,.98))",
          border: ivory ? "3px solid #B8860B" : `3px solid rgba(212,175,55,.82)`,
          borderRadius: 0,
          boxShadow: ivory
            ? "0 10px 24px rgba(0,0,0,.14), inset 0 0 28px rgba(139,105,20,.08)"
            : "0 0 34px rgba(212,175,55,.18), inset 0 0 34px rgba(255,255,255,.035), inset 0 0 70px rgba(0,0,0,.20)",
          padding: "24px 64px",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", inset: 8, border: ivory ? "1px solid rgba(139,105,20,.38)" : "1px solid rgba(248,230,160,.30)" }} />
        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", color: GOLD, fontSize: 22, lineHeight: 1, textShadow: ivory ? "none" : "0 0 12px rgba(212,175,55,.35)" }}>✦</div>
        <div style={{ position: "absolute", bottom: -13, left: "50%", transform: "translateX(-50%)", color: GOLD, fontSize: 22, lineHeight: 1, textShadow: ivory ? "none" : "0 0 12px rgba(212,175,55,.35)" }}>✦</div>
        <div style={{ position: "absolute", left: 18, top: 18, width: 38, height: 22, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
        <div style={{ position: "absolute", right: 18, top: 18, width: 38, height: 22, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
        <div style={{ position: "absolute", left: 18, bottom: 18, width: 38, height: 22, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
        <div style={{ position: "absolute", right: 18, bottom: 18, width: 38, height: 22, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
        <p
          style={{
            position: "relative",
            zIndex: 2,
            margin: "0 0 8px",
            color: ivory ? DEEP_PURPLE : "rgba(255,255,255,.90)",
            fontSize: 16,
            lineHeight: 1.38,
            fontFamily: "Georgia, serif",
          }}
        >
          “{props.verse}”
        </p>
        <p
          style={{
            position: "relative",
            zIndex: 2,
            margin: 0,
            color: ivory ? "#7A5510" : GOLD,
            fontSize: 12,
            fontWeight: 900,
            fontFamily: "Georgia, serif",
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          {props.reference} {props.translation.toUpperCase()}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 130,
          right: 130,
          bottom: 124,
          height: 1,
          zIndex: 15,
          background: ivory
            ? "linear-gradient(90deg, transparent, rgba(139,105,20,.50), transparent)"
            : "linear-gradient(90deg, transparent, rgba(212,175,55,.54), transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 34,
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "1fr 140px 1fr",
          alignItems: "end",
          gap: 26,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 6 }}>
            Presented By
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1, marginBottom: 5 }}>
            {props.ministerName}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: ivory ? "#4E3B2A" : "rgba(255,255,255,.78)", textTransform: "uppercase" }}>
            {props.ministerTitle}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <MinistrySeal ivory={ivory} sealImageUrl={props.sealImageUrl} />
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 7 }}>
            Date of Presentation
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 25, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1 }}>
            {displayDate}
          </div>
        </div>
      </div>
    </div>
  );
}