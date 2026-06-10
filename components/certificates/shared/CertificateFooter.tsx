"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";
import CertificateSeal from "./CertificateSeal";

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

interface CertificateFooterProps {
  ministerName: string;
  ministerTitle: string;
  churchName: string;
  date: string;
  sealImageUrl?: string;
}

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
  const dispDate   = formatDate(date);

  const label: React.CSSProperties = {
    fontSize: "8px",
    fontWeight: 700,
    color: theme.dimColor,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    margin: "0 0 4px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
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
        <p style={{ fontSize: "9px", color: theme.dimColor, letterSpacing: "0.05em", margin: "0 0 1px" }}>
          {dispTitle}
        </p>
        <p style={{ fontSize: "9px", fontWeight: 600, color: theme.subtitleColor, letterSpacing: "0.04em", margin: 0 }}>
          {dispChurch}
        </p>
      </div>

      {/* Center — Seal */}
      <div style={{ flexShrink: 0 }}>
        <CertificateSeal sealImageUrl={sealImageUrl} size={40} />
      </div>

      {/* Right — Date of Presentation */}
      <div style={{ textAlign: "right", flex: 1 }}>
        <p style={label}>Date of Presentation</p>
        <p style={{
          fontSize: "15px",
          fontWeight: 700,
          color: theme.titleColor,
          fontFamily: "Georgia, serif",
          margin: 0,
        }}>
          {dispDate}
        </p>
      </div>
    </div>
  );
}
