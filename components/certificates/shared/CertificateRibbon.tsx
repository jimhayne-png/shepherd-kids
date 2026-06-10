"use client";

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
  diamond: { margin: "4px auto 10px", maxWidth: "280px" },
};

export default function CertificateRibbon({ variant, maxWidth, margin }: CertificateRibbonProps) {
  const { dividerColor, ornamentColor } = useCertificateTheme();
  const defaults = DEFAULTS[variant];

  const resolvedMaxWidth =
    maxWidth !== undefined
      ? typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth
      : defaults.maxWidth;

  const container: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: variant === "diamond" ? "10px" : "12px",
    margin: margin ?? defaults.margin,
    ...(resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : {}),
  };

  if (variant === "triple") {
    return (
      <div style={container}>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${dividerColor})` }} />
        <span style={{ color: ornamentColor, fontSize: "11px", letterSpacing: "0.28em" }}>❖ ❖ ❖</span>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${dividerColor})` }} />
      </div>
    );
  }

  if (variant === "single") {
    return (
      <div style={container}>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${dividerColor})` }} />
        <span style={{ color: ornamentColor, fontSize: "9px" }}>❖</span>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${dividerColor})` }} />
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={{ flex: 1, height: "1px", background: dividerColor }} />
      <div style={{ width: "5px", height: "5px", background: ornamentColor, transform: "rotate(45deg)", opacity: 0.75, flexShrink: 0 }} />
      <div style={{ flex: 1, height: "1px", background: dividerColor }} />
    </div>
  );
}
