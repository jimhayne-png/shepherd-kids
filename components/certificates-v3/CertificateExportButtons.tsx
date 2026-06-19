"use client";

import { useState } from "react";
import {
  exportCertificate,
  type ExportFormat,
} from "@/lib/certificates/exportCertificate";

export interface CertificateExportButtonsProps {
  certRef:   React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

type ExportActionKey = ExportFormat;

const GOLD           = "#D4AF37";
const GOLD_FAINT     = "rgba(212,175,55,0.45)";
const GOLD_BORDER    = "rgba(212,175,55,0.30)";
const GOLD_ACTIVE_BG = "rgba(212,175,55,0.18)";
const GOLD_REST_BG   = "rgba(212,175,55,0.07)";

function Btn({
  label, busy, disabled, title, onClick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        padding:        "7px 14px",
        fontSize:       "11px",
        fontWeight:     700,
        letterSpacing:  "0.06em",
        textTransform:  "uppercase" as const,
        fontFamily:     "Georgia, serif",
        color:          busy ? GOLD_FAINT : GOLD,
        background:     busy ? GOLD_ACTIVE_BG : GOLD_REST_BG,
        border:         `1px solid ${GOLD_BORDER}`,
        borderRadius:   "3px",
        cursor:         disabled ? "not-allowed" : "pointer",
        opacity:        disabled && !busy ? 0.5 : 1,
        transition:     "background 0.15s, color 0.15s",
        whiteSpace:     "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

interface PreviewState {
  html:  string;
  certW: number;
  certH: number;
  scale: number;
}

export default function CertificateExportButtons({
  certRef,
  filename = "certificate",
}: CertificateExportButtonsProps) {
  const [active,  setActive]  = useState<ExportActionKey | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const busy = active !== null;

  function openPreview() {
    if (!certRef.current) return;
    const el     = certRef.current;
    const certW  = el.offsetWidth;
    const certH  = el.offsetHeight;
    const scaleX = (window.innerWidth  * 0.92) / certW;
    const scaleY = (window.innerHeight * 0.82) / certH;
    const scale  = Math.min(scaleX, scaleY, 1);
    setError(null);
    setPreview({ html: el.outerHTML, certW, certH, scale });
  }

  async function runExport(action: ExportActionKey) {
    if (!certRef.current || busy) return;
    setError(null);
    setActive(action);
    try {
      await exportCertificate(certRef.current, action, filename);
    } catch (err) {
      console.error("[CertificateExport] action:", action, err);
      setError(`Export failed — ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActive(null);
    }
  }

  return (
    <>
      <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Btn
          label="Preview"
          busy={false}
          disabled={busy}
          title="Open an in-browser preview of the certificate"
          onClick={openPreview}
        />
        <Btn
          label={active === "pdf-home"  ? "Building…"  : "Download PDF"}
          busy={active === "pdf-home"}
          disabled={busy}
          title="US Letter landscape PDF — home or office printer"
          onClick={() => runExport("pdf-home")}
        />
        <Btn
          label={active === "pdf-print" ? "Building…"  : "Download Print Shop PDF"}
          busy={active === "pdf-print"}
          disabled={busy}
          title="Print Shop PDF with 1/8 in bleed and crop marks"
          onClick={() => runExport("pdf-print")}
        />
        <Btn
          label={active === "png"       ? "Rendering…" : "Download Hi‑Res PNG"}
          busy={active === "png"}
          disabled={busy}
          title="300 DPI PNG suitable for print-shop upload"
          onClick={() => runExport("png")}
        />
      </div>

      <p style={{
        margin:        "6px 0 0",
        fontSize:      "10px",
        color:         GOLD_FAINT,
        letterSpacing: "0.04em",
        fontStyle:     "italic",
      }}>
        Optimized for professional printing on 80–100 lb cardstock.
      </p>

      {error && (
        <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#FF6B6B", wordBreak: "break-word" }}>
          {error}
        </p>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Certificate preview"
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         9999,
            background:     "rgba(0,0,0,0.92)",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "18px",
            padding:        "24px",
          }}
          onClick={() => setPreview(null)}
        >
          <div
            style={{
              width:        preview.certW * preview.scale,
              height:       preview.certH * preview.scale,
              overflow:     "hidden",
              borderRadius: "2px",
              boxShadow:    "0 8px 64px rgba(0,0,0,0.80)",
              flexShrink:   0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                transform:       `scale(${preview.scale})`,
                transformOrigin: "top left",
                width:           preview.certW,
                height:          preview.certH,
                pointerEvents:   "none",
              }}
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </div>

          <button
            style={{
              padding:       "9px 28px",
              background:    "rgba(212,175,55,0.12)",
              border:        `1px solid ${GOLD_BORDER}`,
              color:         GOLD,
              fontSize:      "11px",
              fontWeight:    700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              cursor:        "pointer",
              borderRadius:  "3px",
              fontFamily:    "Georgia, serif",
            }}
            onClick={() => setPreview(null)}
          >
            Close Preview
          </button>

          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: 0 }}>
            Click anywhere outside to close
          </p>
        </div>
      )}
    </>
  );
}
