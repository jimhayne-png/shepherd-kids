"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

interface CertificateBlessingProps {
  blessing: string;
  maxWidth?: number | string;
  showDivider?: boolean;
}

export default function CertificateBlessing({
  blessing,
  maxWidth = 430,
  showDivider = true,
}: CertificateBlessingProps) {
  const theme = useCertificateTheme();

  if (!blessing.trim()) return null;

  const resolvedMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  return (
    <>
      {showDivider && (
        <div
          style={{
            height: "1px",
            background: theme.dividerColor,
            margin: "0 4% 13px",
          }}
        />
      )}
      <p
        style={{
          fontSize: "11px",
          color: theme.blessingColor,
          lineHeight: 1.85,
          fontStyle: "italic",
          textAlign: "center",
          maxWidth: resolvedMaxWidth,
          margin: "0 auto 12px",
        }}
      >
        {blessing}
      </p>
    </>
  );
}
