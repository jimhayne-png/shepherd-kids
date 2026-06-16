"use client";

import type { CertificateTemplate } from "@/lib/certificates/themes";

const GOLD = "#D4AF37";
const LIGHT_GOLD = "#F8E6A0";

export default function PremiumFrame({ template }: { template: CertificateTemplate }) {
  const ivory = template === "white";
  return (
    <>
      <div style={{ position: "absolute", inset: 14, border: ivory ? `2px solid ${GOLD}` : `2px solid ${LIGHT_GOLD}`, zIndex: 5, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 28, border: ivory ? "1px solid rgba(139,105,20,.48)" : "1px solid rgba(212,175,55,.42)", zIndex: 5, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 44, border: ivory ? "1px solid rgba(139,105,20,.22)" : "1px solid rgba(212,175,55,.16)", zIndex: 5, pointerEvents: "none" }} />
    </>
  );
}
