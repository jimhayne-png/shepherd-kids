"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

export default function CertificateBorder() {
  const { midBorder, innerBorder, cornerColor } = useCertificateTheme();
  const bracket = `2px solid ${cornerColor}`;
  const noEvents: React.CSSProperties = { pointerEvents: "none" };

  return (
    <>
      {/* Mid border layer */}
      <div style={{ ...noEvents, position: "absolute", inset: "6px", border: midBorder, borderRadius: "3px" }} />
      {/* Inner border layer */}
      <div style={{ ...noEvents, position: "absolute", inset: "13px", border: innerBorder, borderRadius: "2px" }} />

      {/* L-bracket corners */}
      <div style={{ ...noEvents, position: "absolute", top: "18px",    left: "18px",  width: "24px", height: "24px", borderTop: bracket, borderLeft:   bracket }} />
      <div style={{ ...noEvents, position: "absolute", top: "18px",    right: "18px", width: "24px", height: "24px", borderTop: bracket, borderRight:  bracket }} />
      <div style={{ ...noEvents, position: "absolute", bottom: "18px", left: "18px",  width: "24px", height: "24px", borderBottom: bracket, borderLeft: bracket }} />
      <div style={{ ...noEvents, position: "absolute", bottom: "18px", right: "18px", width: "24px", height: "24px", borderBottom: bracket, borderRight: bracket }} />

      {/* Corner diamond accents */}
      <div style={{ ...noEvents, position: "absolute", top: "14px",    left: "16px",  fontSize: "8px", color: cornerColor, opacity: 0.60, lineHeight: 1, userSelect: "none" }}>◆</div>
      <div style={{ ...noEvents, position: "absolute", top: "14px",    right: "16px", fontSize: "8px", color: cornerColor, opacity: 0.60, lineHeight: 1, userSelect: "none" }}>◆</div>
      <div style={{ ...noEvents, position: "absolute", bottom: "14px", left: "16px",  fontSize: "8px", color: cornerColor, opacity: 0.60, lineHeight: 1, userSelect: "none" }}>◆</div>
      <div style={{ ...noEvents, position: "absolute", bottom: "14px", right: "16px", fontSize: "8px", color: cornerColor, opacity: 0.60, lineHeight: 1, userSelect: "none" }}>◆</div>
    </>
  );
}
