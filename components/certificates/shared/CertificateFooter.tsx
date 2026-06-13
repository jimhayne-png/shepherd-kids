"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";
import type { CertTheme } from "@/lib/certificates/themes";

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return "—";
  try {
    return new Date(raw + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

// ── Ministry seal (no-image state) ───────────────────────────────────────────
// Double ring + serifed Latin cross + cardinal accent dots.
// All dimensions scaled ×1.25 over the prior 52 px version → 65 px medallion.

function MinistryStamp({ t }: { t: CertTheme }) {
  return (
    <svg
      width="65"
      height="65"
      viewBox="0 0 65 65"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Outer ring */}
      <circle cx="32.5" cy="32.5" r="29.4" fill={t.sealBackground} stroke={t.sealBorder} strokeWidth="1.9" />
      {/* Inner ring */}
      <circle cx="32.5" cy="32.5" r="23.1" fill="none" stroke={t.sealBorder} strokeWidth="0.75" opacity="0.50" />
      {/* Cardinal accent dots on inner ring */}
      <circle cx="32.5" cy="9.4"  r="1.6" fill={t.sealBorder} opacity="0.55" />
      <circle cx="55.6" cy="32.5" r="1.6" fill={t.sealBorder} opacity="0.55" />
      <circle cx="32.5" cy="55.6" r="1.6" fill={t.sealBorder} opacity="0.55" />
      <circle cx="9.4"  cy="32.5" r="1.6" fill={t.sealBorder} opacity="0.55" />
      {/* Latin cross — vertical shaft */}
      <rect x="30.9" y="16.3" width="3.1" height="33.8" rx="0.6" fill={t.sealBorder} opacity="0.90" />
      {/* Latin cross — horizontal arm */}
      <rect x="17.5" y="27.2" width="30.0" height="3.1" rx="0.6" fill={t.sealBorder} opacity="0.90" />
      {/* Serif end caps — top */}
      <rect x="28.1" y="16.3" width="8.8" height="2.3" rx="0.5" fill={t.sealBorder} opacity="0.60" />
      {/* Serif end caps — bottom */}
      <rect x="28.1" y="47.8" width="8.8" height="2.3" rx="0.5" fill={t.sealBorder} opacity="0.60" />
      {/* Serif end caps — left arm */}
      <rect x="17.5" y="24.4" width="2.3" height="8.8" rx="0.5" fill={t.sealBorder} opacity="0.60" />
      {/* Serif end caps — right arm */}
      <rect x="45.3" y="24.4" width="2.3" height="8.8" rx="0.5" fill={t.sealBorder} opacity="0.60" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CertificateFooterProps {
  ministerName: string;
  ministerTitle: string;
  churchName: string;
  date: string;
  sealImageUrl?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CertificateFooter({
  ministerName,
  ministerTitle,
  churchName,
  date,
  sealImageUrl,
}: CertificateFooterProps) {
  const theme = useCertificateTheme();

  const dispMin    = ministerName  || "Minister's Name";
  const dispTitle  = ministerTitle || "Children's Ministry Director";
  const dispChurch = churchName    || "Your Church Name";
  const fullDate   = formatDate(date);

  const label: React.CSSProperties = {
    fontSize: "8px",
    fontWeight: 700,
    color: theme.dimColor,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    margin: "0 0 4px",
  };

  return (
    <div style={{ paddingTop: "2px" }}>

      {/* ── Ornamental top rule ─────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "9px",
      }}>
        <div style={{ flex: 1, height: "0.75px", background: theme.dividerColor }} />
        <svg
          width="10" height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          style={{ display: "block", flexShrink: 0 }}
        >
          <path d="M5 0.5 L9 5 L5 9.5 L1 5 Z" fill={theme.ornamentColor} opacity="0.65" />
        </svg>
        <div style={{ flex: 1, height: "0.75px", background: theme.dividerColor }} />
      </div>

      {/* ── Three-column footer ─────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}>

        {/* Left — Presented By */}
        <div style={{ textAlign: "left", flex: 1 }}>
          <p style={label}>Presented By</p>
          <p style={{
            fontSize: "17px",
            color: theme.titleColor,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            lineHeight: 1.15,
            margin: "0 0 2px",
          }}>
            {dispMin}
          </p>
          <p style={{
            fontSize: "9px",
            color: theme.dimColor,
            letterSpacing: "0.05em",
            margin: "0 0 1px",
          }}>
            {dispTitle}
          </p>
          <p style={{
            fontSize: "9px",
            fontWeight: 600,
            color: theme.subtitleColor,
            letterSpacing: "0.04em",
            margin: 0,
          }}>
            {dispChurch}
          </p>
        </div>

        {/* Center — Ministry seal (65 px, up from 52 px) */}
        <div style={{ flexShrink: 0 }}>
          {sealImageUrl ? (
            <img
              src={sealImageUrl}
              alt="Church seal"
              style={{
                width: "65px",
                height: "65px",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <MinistryStamp t={theme} />
          )}
        </div>

        {/* Right — Date of Presentation */}
        <div style={{ textAlign: "right", flex: 1 }}>
          <p style={label}>Date of Presentation</p>
          {/* Single-line date — mirrors minister-name visual weight */}
          <p style={{
            fontSize: "17px",
            color: theme.titleColor,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            lineHeight: 1.15,
            margin: "0 0 5px",
          }}>
            {fullDate}
          </p>
          {/* Diamond anchor — mirrors church-name line visual weight on left */}
          <svg
            width="22" height="8"
            viewBox="0 0 22 8"
            aria-hidden="true"
            style={{ display: "block", marginLeft: "auto" }}
          >
            <line x1="0"  y1="4" x2="7"  y2="4" stroke={theme.dividerColor}  strokeWidth="0.6" opacity="0.55" />
            <path d="M11 1.2 L13.8 4 L11 6.8 L8.2 4 Z"  fill={theme.ornamentColor} opacity="0.52" />
            <line x1="15" y1="4" x2="22" y2="4" stroke={theme.dividerColor}  strokeWidth="0.6" opacity="0.55" />
          </svg>
        </div>

      </div>
    </div>
  );
}
