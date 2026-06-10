"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

interface CertificateScriptureProps {
  verse: string;
  reference: string;
  translation: "kjv" | "niv";
  maxWidth?: number | string;
}

export default function CertificateScripture({
  verse,
  reference,
  translation,
  maxWidth,
}: CertificateScriptureProps) {
  const theme = useCertificateTheme();

  const resolvedMaxWidth =
    maxWidth !== undefined
      ? typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth
      : "440px";

  const displayVerse     = verse     || "Scripture verse";
  const displayReference = reference || "Reference";

  return (
    <div
      style={{
        border: `1px solid ${theme.medallionBorder}`,
        background: theme.medallionBackground,
        borderRadius: "4px",
        padding: "12px 20px",
        maxWidth: resolvedMaxWidth,
        margin: "0 auto 14px",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          color: theme.scriptureTextColor,
          margin: "0 0 5px",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        {displayVerse}
      </p>
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: theme.scriptureRefColor,
          margin: 0,
          letterSpacing: "0.08em",
        }}
      >
        — {displayReference} {translation.toUpperCase()}
      </p>
    </div>
  );
}
