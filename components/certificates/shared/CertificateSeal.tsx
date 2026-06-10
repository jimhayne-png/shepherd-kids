"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

interface CertificateSealProps {
  sealImageUrl?: string;
  size?: number;
}

export default function CertificateSeal({ sealImageUrl, size = 40 }: CertificateSealProps) {
  const theme = useCertificateTheme();
  const crossSize = Math.round(size * 0.46);

  if (sealImageUrl) {
    return (
      <img
        src={sealImageUrl}
        alt="Church seal"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: `1.5px solid ${theme.sealBorder}`,
        background: theme.sealBackground,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: `${crossSize}px`,
          color: theme.sealBorder,
          lineHeight: 1,
          fontFamily: "Georgia, serif",
        }}
      >
        ✝
      </span>
    </div>
  );
}
