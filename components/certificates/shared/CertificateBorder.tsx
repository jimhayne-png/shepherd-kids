"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";

// ── Corner filigree (drawn in TL orientation) ─────────────────────────────────
// CSS scale transforms on wrapper divs flip/mirror for TR / BR / BL.
// Junction sits at SVG (4, 4) = cert absolute (18, 18) matching the original bracket inset.
function CornerFiligree({ color }: { color: string }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Primary L — horizontal arm */}
      <line x1="4"  y1="4"  x2="30" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Primary L — vertical arm */}
      <line x1="4"  y1="4"  x2="4"  y2="30" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Serif end tick — horizontal arm terminus */}
      <line x1="30" y1="1"  x2="30" y2="7"  stroke={color} strokeWidth="0.8" opacity="0.65" />
      {/* Serif end tick — vertical arm terminus */}
      <line x1="1"  y1="30" x2="7"  y2="30" stroke={color} strokeWidth="0.8" opacity="0.65" />
      {/* Inner hairline echo L — horizontal */}
      <line x1="10" y1="10" x2="24" y2="10" stroke={color} strokeWidth="0.6" opacity="0.40" />
      {/* Inner hairline echo L — vertical */}
      <line x1="10" y1="10" x2="10" y2="24" stroke={color} strokeWidth="0.6" opacity="0.40" />
      {/* Corner lozenge at arm junction */}
      <path d="M4 1.8 L6.2 4 L4 6.2 L1.8 4 Z" fill={color} opacity="0.78" />
    </svg>
  );
}

// ── Mid-side ornamental connector ─────────────────────────────────────────────
// Hairline dash–lozenge–dash; separate H and V variants for precise sizing.
function SideOrnamentH({ color }: { color: string }) {
  return (
    <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden="true" style={{ display: "block" }}>
      <line x1="0"  y1="4" x2="11" y2="4" stroke={color} strokeWidth="0.6" opacity="0.44" />
      <path d="M16 1.5 L18.5 4 L16 6.5 L13.5 4 Z" fill={color} opacity="0.50" />
      <line x1="21" y1="4" x2="32" y2="4" stroke={color} strokeWidth="0.6" opacity="0.44" />
    </svg>
  );
}

function SideOrnamentV({ color }: { color: string }) {
  return (
    <svg width="8" height="32" viewBox="0 0 8 32" aria-hidden="true" style={{ display: "block" }}>
      <line x1="4" y1="0"  x2="4" y2="11" stroke={color} strokeWidth="0.6" opacity="0.44" />
      <path d="M1.5 16 L4 18.5 L6.5 16 L4 13.5 Z" fill={color} opacity="0.50" />
      <line x1="4" y1="21" x2="4" y2="32" stroke={color} strokeWidth="0.6" opacity="0.44" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CertificateBorder() {
  const { midBorder, innerBorder, cornerColor } = useCertificateTheme();
  const abs: React.CSSProperties = { pointerEvents: "none", position: "absolute" };

  return (
    <>
      {/* ── Three-rule frame ─────────────────────────────────────────────── */}
      <div style={{ ...abs, inset: "6px",  border: midBorder,  borderRadius: "3px" }} />
      <div style={{ ...abs, inset: "13px", border: innerBorder, borderRadius: "2px" }} />
      {/* Second inner hairline — very faint third rule for engraved depth */}
      <div style={{
        ...abs,
        inset: "20px",
        border: `0.5px solid ${cornerColor}`,
        borderRadius: "1px",
        opacity: 0.15,
      }} />

      {/* ── Corner filigree ──────────────────────────────────────────────── */}
      {/* TL — no transform */}
      <div style={{ ...abs, top: "14px", left: "14px" }}>
        <CornerFiligree color={cornerColor} />
      </div>
      {/* TR — mirror horizontally */}
      <div style={{ ...abs, top: "14px", right: "14px", transform: "scaleX(-1)" }}>
        <CornerFiligree color={cornerColor} />
      </div>
      {/* BR — rotate 180° */}
      <div style={{ ...abs, bottom: "14px", right: "14px", transform: "scale(-1,-1)" }}>
        <CornerFiligree color={cornerColor} />
      </div>
      {/* BL — mirror vertically */}
      <div style={{ ...abs, bottom: "14px", left: "14px", transform: "scaleY(-1)" }}>
        <CornerFiligree color={cornerColor} />
      </div>

      {/* ── Mid-side ornamental connectors ──────────────────────────────── */}
      {/* Top center — sits between mid rule (6px) and inner rule (13px) */}
      <div style={{ ...abs, top: "8px", left: "50%", transform: "translateX(-50%)" }}>
        <SideOrnamentH color={cornerColor} />
      </div>
      {/* Bottom center */}
      <div style={{ ...abs, bottom: "8px", left: "50%", transform: "translateX(-50%)" }}>
        <SideOrnamentH color={cornerColor} />
      </div>
      {/* Left center */}
      <div style={{ ...abs, left: "8px", top: "50%", transform: "translateY(-50%)" }}>
        <SideOrnamentV color={cornerColor} />
      </div>
      {/* Right center */}
      <div style={{ ...abs, right: "8px", top: "50%", transform: "translateY(-50%)" }}>
        <SideOrnamentV color={cornerColor} />
      </div>
    </>
  );
}
