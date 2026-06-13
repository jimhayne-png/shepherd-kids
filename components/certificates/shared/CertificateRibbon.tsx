"use client";

import { useId } from "react";
import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

type RibbonVariant = "triple" | "single" | "diamond";

interface CertificateRibbonProps {
  variant: RibbonVariant;
  maxWidth?: number | string;
  margin?: string;
}

const DEFAULTS: Record<RibbonVariant, { margin: string; maxWidth?: string }> = {
  triple:  { margin: "9px 0 10px" },
  single:  { margin: "4px 0 13px" },
  diamond: { margin: "4px auto 10px", maxWidth: "340px" },
};

export default function CertificateRibbon({ variant, maxWidth, margin }: CertificateRibbonProps) {
  const { dividerColor, ornamentColor, cornerColor } = useCertificateTheme();
  // useId ensures gradient IDs are unique when multiple instances render on the same page.
  const uid = useId().replace(/:/g, "_");
  const defaults = DEFAULTS[variant];

  const resolvedMaxWidth =
    maxWidth !== undefined
      ? typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth
      : defaults.maxWidth;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: margin ?? defaults.margin,
    ...(resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : {}),
  };

  // ── Triple: fading rules + ❖ ❖ ❖ with refined terminal lozenges ──────────────
  if (variant === "triple") {
    return (
      <div style={rowStyle}>
        <svg width="7" height="9" viewBox="0 0 7 9" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
          <path d="M3.5 0.5 L6.5 4.5 L3.5 8.5 L0.5 4.5 Z" fill={ornamentColor} opacity="0.56" />
        </svg>
        <div style={{ flex: 1, height: "0.75px", background: `linear-gradient(to right, transparent, ${dividerColor})` }} />
        <span style={{ color: ornamentColor, fontSize: "11px", letterSpacing: "0.28em", lineHeight: 1, flexShrink: 0 }}>❖ ❖ ❖</span>
        <div style={{ flex: 1, height: "0.75px", background: `linear-gradient(to left, transparent, ${dividerColor})` }} />
        <svg width="7" height="9" viewBox="0 0 7 9" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
          <path d="M3.5 0.5 L6.5 4.5 L3.5 8.5 L0.5 4.5 Z" fill={ornamentColor} opacity="0.56" />
        </svg>
      </div>
    );
  }

  // ── Single: fading rules + ❖ with terminal lozenges ─────────────────────────
  if (variant === "single") {
    return (
      <div style={rowStyle}>
        <svg width="5" height="7" viewBox="0 0 5 7" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
          <path d="M2.5 0.5 L4.5 3.5 L2.5 6.5 L0.5 3.5 Z" fill={ornamentColor} opacity="0.50" />
        </svg>
        <div style={{ flex: 1, height: "0.75px", background: `linear-gradient(to right, transparent, ${dividerColor})` }} />
        <span style={{ color: ornamentColor, fontSize: "9px", lineHeight: 1, flexShrink: 0 }}>❖</span>
        <div style={{ flex: 1, height: "0.75px", background: `linear-gradient(to left, transparent, ${dividerColor})` }} />
        <svg width="5" height="7" viewBox="0 0 5 7" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
          <path d="M2.5 0.5 L4.5 3.5 L2.5 6.5 L0.5 3.5 Z" fill={ornamentColor} opacity="0.50" />
        </svg>
      </div>
    );
  }

  // ── Diamond: engraved plaque-base treatment ───────────────────────────────────
  //
  // Terminal end-brackets (vertical ticks) + fading rules + flanked center diamond
  // + a second hairline rule below.  Sitting beneath the subtitle <p>, this creates
  // an implied engraved-plaque surround without modifying any other component.
  const fl = `rib_fl_${uid}`;
  const fr = `rib_fr_${uid}`;

  return (
    <div style={{ margin: margin ?? defaults.margin, ...(resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : {}) }}>
      <svg
        viewBox="0 0 340 20"
        width="100%"
        height="20"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={fl} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={dividerColor} stopOpacity="0" />
            <stop offset="100%" stopColor={dividerColor} stopOpacity="1" />
          </linearGradient>
          <linearGradient id={fr} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={dividerColor} stopOpacity="1" />
            <stop offset="100%" stopColor={dividerColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left terminal: vertical tick + short connector into rule */}
        <line x1="4"   y1="3"  x2="4"   y2="12" stroke={cornerColor}  strokeWidth="0.9" opacity="0.52" />
        <line x1="4"   y1="7"  x2="16"  y2="7"  stroke={dividerColor} strokeWidth="0.65" opacity="0.72" />

        {/* Left fading rule */}
        <line x1="16"  y1="7"  x2="150" y2="7"  stroke={`url(#${fl})`} strokeWidth="0.75" />

        {/* Center ornament: small lozenge — primary diamond — small lozenge */}
        <path d="M158 5 L161 7 L158 9 L155 7 Z" fill={ornamentColor} opacity="0.52" />
        <path d="M170 3 L178 7 L170 11 L162 7 Z" fill={ornamentColor} opacity="0.82" />
        <path d="M182 5 L185 7 L182 9 L179 7 Z" fill={ornamentColor} opacity="0.52" />

        {/* Right fading rule */}
        <line x1="190" y1="7"  x2="324" y2="7"  stroke={`url(#${fr})`} strokeWidth="0.75" />

        {/* Right terminal: short connector + vertical tick */}
        <line x1="324" y1="7"  x2="336" y2="7"  stroke={dividerColor} strokeWidth="0.65" opacity="0.72" />
        <line x1="336" y1="3"  x2="336" y2="12" stroke={cornerColor}  strokeWidth="0.9" opacity="0.52" />

        {/* Second hairline rule — letterpress depth */}
        <line x1="20"  y1="13" x2="320" y2="13" stroke={dividerColor} strokeWidth="0.4" opacity="0.36" />
      </svg>
    </div>
  );
}
