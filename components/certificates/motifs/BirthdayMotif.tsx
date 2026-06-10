"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";
import type { CertTheme } from "@/lib/certificates/themes";

type MotifSide = "center" | "left" | "right";

interface BirthdayMotifProps {
  size?: number;
  side?: MotifSide;
}

// ── SVG sub-trees ─────────────────────────────────────────────────────────────

function CenterBalloons({ t }: { t: CertTheme }) {
  return (
    <>
      {/* Left balloon */}
      <ellipse cx="18" cy="24" rx="13" ry="16" fill={t.motifBalloon1} opacity={0.88} />
      <ellipse cx="14" cy="18" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 14, 18)" />
      <circle cx="18" cy="40" r="2" fill={t.motifBalloon1} opacity={0.70} />
      <path d="M18 42 Q14 52 18 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
      {/* Center balloon — gold, tallest */}
      <ellipse cx="38" cy="19" rx="14" ry="17" fill={t.motifBalloon2} opacity={0.92} />
      <ellipse cx="33" cy="13" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 33, 13)" />
      <circle cx="38" cy="36" r="2.2" fill={t.motifBalloon2} opacity={0.70} />
      <path d="M38 38 Q34 50 38 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
      {/* Right balloon */}
      <ellipse cx="58" cy="24" rx="13" ry="16" fill={t.motifBalloon3} opacity={0.82} />
      <ellipse cx="54" cy="18" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 54, 18)" />
      <circle cx="58" cy="40" r="2" fill={t.motifBalloon3} opacity={0.70} />
      <path d="M58 42 Q54 52 58 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
    </>
  );
}

// Two-balloon cluster for corner / side placement.
// flip=true mirrors horizontally for the right side.
function SideBalloons({ t, flip }: { t: CertTheme; flip: boolean }) {
  return (
    <g transform={flip ? "scale(-1,1) translate(-54,0)" : undefined}>
      {/* Upper balloon — accent/gold */}
      <ellipse cx="36" cy="16" rx="13" ry="15" fill={t.motifBalloon2} opacity={0.90} />
      <ellipse cx="31" cy="10" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 31, 10)" />
      <circle cx="36" cy="31" r="2" fill={t.motifBalloon2} opacity={0.70} />
      <path d="M36 33 Q32 46 34 60 Q35 70 34 78" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
      {/* Lower balloon — primary purple */}
      <ellipse cx="17" cy="38" rx="11" ry="14" fill={t.motifBalloon1} opacity={0.84} />
      <ellipse cx="13" cy="32" rx="3.5" ry="2.5" fill={t.motifShineColor} transform="rotate(-20, 13, 32)" />
      <circle cx="17" cy="52" r="1.8" fill={t.motifBalloon1} opacity={0.70} />
      <path d="M17 54 Q14 62 16 72 Q17 76 16 78" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
    </g>
  );
}

// ── View-box and dimension constants ─────────────────────────────────────────

const CENTER_VB = { w: 76, h: 68 };
const SIDE_VB   = { w: 54, h: 80 };

function dims(vb: { w: number; h: number }, size: number) {
  return { width: size, height: Math.round(size * vb.h / vb.w) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BirthdayMotif({ size = 95, side = "center" }: BirthdayMotifProps) {
  const theme = useCertificateTheme();

  if (side === "center") {
    const { width, height } = dims(CENTER_VB, size);
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${CENTER_VB.w} ${CENTER_VB.h}`}
        style={{ overflow: "visible", display: "block" }}
      >
        <CenterBalloons t={theme} />
      </svg>
    );
  }

  const { width, height } = dims(SIDE_VB, size);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${SIDE_VB.w} ${SIDE_VB.h}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <SideBalloons t={theme} flip={side === "right"} />
    </svg>
  );
}
