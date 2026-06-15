"use client";

import type { CSSProperties } from "react";
import type { CertificateTemplate } from "@/lib/certificates/themes";

type CornerPosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

interface LuxuryBorderProps {
  template: CertificateTemplate;
}

const GOLD = "#D4AF37";
const LIGHT_GOLD = "#F8E6A0";
const DARK_GOLD = "#7B5B17";

function getCornerStyle(position: CornerPosition): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    width: 118,
    height: 118,
    zIndex: 8,
    pointerEvents: "none",
  };

  if (position === "topLeft") return { ...base, top: 18, left: 18 };
  if (position === "topRight") return { ...base, top: 18, right: 18, transform: "scaleX(-1)" };
  if (position === "bottomLeft") return { ...base, bottom: 18, left: 18, transform: "scaleY(-1)" };

  return { ...base, bottom: 18, right: 18, transform: "scale(-1)" };
}

function CornerFiligree({
  position,
  ivory,
}: {
  position: CornerPosition;
  ivory: boolean;
}) {
  const primary = ivory ? "#8B6914" : GOLD;
  const highlight = ivory ? "#C89B2C" : LIGHT_GOLD;
  const shadow = ivory ? "rgba(80,50,8,.22)" : "rgba(0,0,0,.55)";

  return (
    <svg viewBox="0 0 150 150" style={getCornerStyle(position)} aria-hidden="true">
      <defs>
        <linearGradient id={`cornerGold-${position}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF6C5" />
          <stop offset="35%" stopColor={highlight} />
          <stop offset="68%" stopColor={primary} />
          <stop offset="100%" stopColor={DARK_GOLD} />
        </linearGradient>
        <filter id={`cornerGlow-${position}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor={shadow} floodOpacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={highlight} floodOpacity={ivory ? "0.20" : "0.28"} />
        </filter>
      </defs>

      <path
        d="M14 136V14h122"
        fill="none"
        stroke={`url(#cornerGold-${position})`}
        strokeWidth="5"
        strokeLinecap="square"
        filter={`url(#cornerGlow-${position})`}
      />
      <path
        d="M30 120V30h90"
        fill="none"
        stroke={highlight}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <path
        d="M38 38c28 4 38 26 18 44 31-4 48 17 40 50"
        fill="none"
        stroke={`url(#cornerGold-${position})`}
        strokeWidth="3"
        strokeLinecap="round"
        filter={`url(#cornerGlow-${position})`}
      />
      <path
        d="M47 29c-7 30 18 43 45 30M29 95c25-8 44 3 55 29"
        fill="none"
        stroke={highlight}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.88"
      />
      <path
        d="M83 31l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z"
        fill={`url(#cornerGold-${position})`}
        opacity="0.96"
        filter={`url(#cornerGlow-${position})`}
      />
      <circle cx="60" cy="61" r="5.5" fill={highlight} opacity="0.92" />
    </svg>
  );
}

export default function LuxuryBorder({ template }: LuxuryBorderProps) {
  const ivory = template === "white";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 5,
          pointerEvents: "none",
          border: ivory ? "8px solid #8B6914" : `8px solid ${GOLD}`,
          boxSizing: "border-box",
          boxShadow: ivory
            ? "inset 0 0 28px rgba(80,50,8,.10)"
            : "inset 0 0 44px rgba(212,175,55,.12), inset 0 0 120px rgba(0,0,0,.34)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 14,
          zIndex: 5,
          pointerEvents: "none",
          border: ivory ? `3px solid ${GOLD}` : `3px solid ${LIGHT_GOLD}`,
          boxSizing: "border-box",
          boxShadow: ivory
            ? "0 0 10px rgba(212,175,55,.18)"
            : "0 0 18px rgba(248,230,160,.22)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 29,
          zIndex: 5,
          pointerEvents: "none",
          border: ivory
            ? "1px solid rgba(139,105,20,.46)"
            : "1px solid rgba(212,175,55,.38)",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 42,
          zIndex: 5,
          pointerEvents: "none",
          border: ivory
            ? "1px solid rgba(139,105,20,.20)"
            : "1px solid rgba(248,230,160,.14)",
          boxSizing: "border-box",
        }}
      />

      <CornerFiligree position="topLeft" ivory={ivory} />
      <CornerFiligree position="topRight" ivory={ivory} />
      <CornerFiligree position="bottomLeft" ivory={ivory} />
      <CornerFiligree position="bottomRight" ivory={ivory} />
    </>
  );
}
