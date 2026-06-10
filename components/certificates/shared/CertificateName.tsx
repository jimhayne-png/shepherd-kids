"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

const BASE_SIZE_PX = 54;

function nameScale(name: string): number {
  const len = name.length;
  if (len <= 18) return 1.00;
  if (len <= 24) return 0.92;
  if (len <= 30) return 0.84;
  return 0.76;
}

interface CertificateNameProps {
  childName: string;
  maxWidth?: number | string;
}

export default function CertificateName({ childName, maxWidth }: CertificateNameProps) {
  const theme = useCertificateTheme();
  const display  = childName || "Child's Name";
  const fontSize = Math.round(BASE_SIZE_PX * nameScale(display));

  const resolvedMaxWidth =
    maxWidth !== undefined
      ? typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth
      : "100%";

  return (
    <h1
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
        lineHeight: 1.05,
        letterSpacing: "0.01em",
        color: theme.nameColor,
        textAlign: "center",
        whiteSpace: "nowrap",
        maxWidth: resolvedMaxWidth,
        margin: 0,
        marginBottom: "12px",
        marginLeft: "auto",
        marginRight: "auto",
        ...(theme.nameTextShadow ? { textShadow: theme.nameTextShadow } : {}),
      }}
    >
      {display}
    </h1>
  );
}
