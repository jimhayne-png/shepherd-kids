"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

interface CertificateHeaderProps {
  churchName: string;
  churchTagline?: string;
  logoUrl?: string;
}

export default function CertificateHeader({
  churchName,
  churchTagline,
  logoUrl,
}: CertificateHeaderProps) {
  const theme = useCertificateTheme();
  const isPurple = theme.topAccentType === "cross-glow";
  const logoWidth  = isPurple ? 120 : 110;
  const logoHeight = isPurple ? 48  : 44;

  return (
    <div style={{ textAlign: "center" }}>

      {/* Top accent */}
      {theme.topAccentType === "cross-glow" ? (
        <div style={{
          fontSize: "24px",
          lineHeight: 1,
          marginBottom: "5px",
          color: theme.topAccentColor,
          textShadow: theme.crossGlowTextShadow,
        }}>
          ✝
        </div>
      ) : (
        <div style={{ fontSize: "26px", lineHeight: 1, marginBottom: "4px" }}>👑</div>
      )}

      {/* Church logo area — always rectangular, never circular */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "5px" }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={churchName || "Church logo"}
            style={{
              width: `${logoWidth}px`,
              height: `${logoHeight}px`,
              objectFit: "contain",
              borderRadius: "3px",
              display: "block",
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: `${logoWidth}px`,
            height: `${logoHeight}px`,
            border: `1.5px dashed ${theme.logoAreaBorder}`,
            borderRadius: "3px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            background: theme.logoAreaBackground,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "16px", color: theme.logoAreaLabelColor, lineHeight: 1 }}>✝</span>
            <span style={{
              fontSize: "7px",
              color: theme.logoAreaLabelColor,
              letterSpacing: "0.08em",
              fontWeight: 700,
              textTransform: "uppercase" as const,
            }}>
              Church Logo
            </span>
          </div>
        )}
      </div>

      {/* Church name */}
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

      {/* Church tagline — section hidden entirely when blank */}
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
