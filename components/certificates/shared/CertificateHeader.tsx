"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

interface CertificateHeaderProps {
  churchName: string;
  churchTagline?: string;
  logoUrl?: string;
}

// ── Premium heraldic crest (no-logo state) ────────────────────────────────────
//
// Shield + Latin cross + flanking ornamental rules.
// primary  → theme.cornerColor  (solid gold: #D4AF37 / #8B6914)
// accent   → theme.ornamentColor (softer gold for rules and minor marks)
// glow     → true on Royal Purple theme (adds CSS drop-shadow filter)

function ChurchCrest({
  primary,
  accent,
  glow,
}: {
  primary: string;
  accent: string;
  glow: boolean;
}) {
  const glowFilter = glow
    ? "drop-shadow(0 0 7px rgba(212,175,55,0.62)) drop-shadow(0 0 16px rgba(212,175,55,0.26))"
    : undefined;

  // All coordinates in a 360 × 54 viewBox.
  // Shield is centered at x=180; cross is a Latin cross with arm at ~38% from top.

  return (
    <svg
      viewBox="0 0 360 54"
      width="320"
      height="48"
      aria-hidden="true"
      style={{
        display: "block",
        margin: "0 auto 5px",
        overflow: "visible",
        filter: glowFilter,
      }}
    >
      {/* ── Left ornamental rule ── */}
      <line x1="5" y1="27" x2="147" y2="27" stroke={accent} strokeWidth="0.75" opacity="0.60" />
      {/* Left outer end lozenge */}
      <path d="M5 24.4 L9.2 27 L5 29.6 L0.8 27 Z" fill={accent} opacity="0.50" />
      {/* Left mid-rule secondary lozenge */}
      <path d="M87 24.8 L91 27 L87 29.2 L83 27 Z" fill={accent} opacity="0.48" />
      {/* Left meeting lozenge (flanks the shield) */}
      <path d="M147 23 L155 27 L147 31 L139 27 Z" fill={primary} opacity="0.80" />

      {/* ── Heraldic shield (outer) ── */}
      {/* Classic pointed shield: straight top, cubic-bezier curved sides tapering to bottom point */}
      <path
        d="M161 4 L199 4 C203 20 200 36 180 50 C160 36 157 20 161 4 Z"
        fill="none"
        stroke={primary}
        strokeWidth="1.30"
        strokeLinejoin="round"
        opacity="0.70"
      />
      {/* Inner shield — double-rule effect (inset ~4 px) */}
      <path
        d="M165 8 L195 8 C198 21 196 34 180 45 C164 34 162 21 165 8 Z"
        fill="none"
        stroke={primary}
        strokeWidth="0.55"
        strokeLinejoin="round"
        opacity="0.34"
      />

      {/* ── Latin cross centered at (180, 26) ── */}
      {/* Vertical bar: y 10 → 40 */}
      <rect x="178.75" y="10"   width="2.5"  height="30" rx="0.5" fill={primary} opacity="0.92" />
      {/* Horizontal bar: Latin proportion — arm at ~38 % from top (y ≈ 21) */}
      <rect x="167"    y="20.75" width="26"   height="2.5" rx="0.5" fill={primary} opacity="0.92" />
      {/* Serif end caps — top */}
      <rect x="176"    y="10"   width="8"    height="2"   rx="0.5" fill={primary} opacity="0.65" />
      {/* Serif end caps — bottom */}
      <rect x="176"    y="38"   width="8"    height="2"   rx="0.5" fill={primary} opacity="0.65" />
      {/* Serif end caps — left arm */}
      <rect x="167"    y="19.5" width="2"    height="5.5" rx="0.5" fill={primary} opacity="0.65" />
      {/* Serif end caps — right arm */}
      <rect x="191"    y="19.5" width="2"    height="5.5" rx="0.5" fill={primary} opacity="0.65" />

      {/* ── Right ornamental rule ── */}
      <line x1="213" y1="27" x2="355" y2="27" stroke={accent} strokeWidth="0.75" opacity="0.60" />
      {/* Right meeting lozenge */}
      <path d="M213 23 L221 27 L213 31 L205 27 Z" fill={primary} opacity="0.80" />
      {/* Right mid-rule secondary lozenge */}
      <path d="M273 24.8 L277 27 L273 29.2 L269 27 Z" fill={accent} opacity="0.48" />
      {/* Right outer end lozenge */}
      <path d="M355 24.4 L359.2 27 L355 29.6 L350.8 27 Z" fill={accent} opacity="0.50" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CertificateHeader({
  churchName,
  churchTagline,
  logoUrl,
}: CertificateHeaderProps) {
  const theme = useCertificateTheme();
  const hasGlow = !!theme.crossGlowTextShadow;

  return (
    <div style={{ textAlign: "center" }}>

      {logoUrl ? (
        /* Uploaded logo — clean presentation, no border or placeholder box */
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
          <img
            src={logoUrl}
            alt={churchName || "Church logo"}
            style={{
              maxWidth: "140px",
              maxHeight: "52px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ) : (
        /* No logo — premium heraldic crest */
        <ChurchCrest
          primary={theme.cornerColor}
          accent={theme.ornamentColor}
          glow={hasGlow}
        />
      )}

      {/* Church name — prestigious, spaced caps */}
      <p style={{
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.15em",
        color: theme.titleColor,
        textTransform: "uppercase" as const,
        margin: "0 0 2px",
        fontFamily: "Georgia, serif",
      }}>
        {churchName || "Your Church Name"}
      </p>

      {/* Tagline — secondary, hidden when blank */}
      {churchTagline && (
        <p style={{
          fontSize: "10px",
          color: theme.subtitleColor,
          margin: 0,
          fontStyle: "italic",
          letterSpacing: "0.05em",
        }}>
          {churchTagline}
        </p>
      )}

    </div>
  );
}
