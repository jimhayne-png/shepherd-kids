"use client";

import React from "react";
import QRCodeImage from "./QRCodeImage";

export type SharedLabelData = {
  labelType: "child" | "parent";
  childName: string;
  parentName: string;
  roomName: string | null;
  securityCode: string;
  allergies: string | null;
  medicalNotes: string | null;
  specialInstructions: string | null;
  isFirstTime: boolean;
  churchName: string;
  qrToken: string | null;
  labelMode: "smart" | "classic";
  smartLabelQrEnabled: boolean;
};

const LABEL_WRAP: React.CSSProperties = {
  width: "4in",
  height: "2in",
  boxSizing: "border-box",
  overflow: "hidden",
  pageBreakAfter: "always",
  breakAfter: "page",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundColor: "#fff",
  color: "#000",
  border: "1.5px solid #000",
};

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: 4in 2in landscape; margin: 0; }
        body { margin: 0; padding: 0; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
      .label-wrap {
        width: 4in !important;
        height: 2in !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #fff !important;
        font-family: Arial, Helvetica, sans-serif !important;
        page-break-after: always !important;
        border: 1.5px solid #000 !important;
      }
      .label-body {
        display: flex !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      .label-left {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        min-width: 0 !important;
      }
      .label-right {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
    `}</style>
  );
}

// Merge medicalNotes + specialInstructions into one sentence if both present
function buildMedicalLine(medicalNotes: string | null, specialInstructions: string | null): string | null {
  const parts = [medicalNotes, specialInstructions]
    .filter(Boolean)
    .map((s) => (s as string).trim().replace(/\.+$/, ""));
  return parts.length > 0 ? parts.join(". ") : null;
}

// Shared left column used by both child label variants
function ChildLabelLeft({ data }: { data: SharedLabelData }) {
  const combinedMedical = buildMedicalLine(data.medicalNotes, data.specialInstructions);
  const hasCare = !!(data.allergies || combinedMedical);

  return (
    <div
      className="label-left"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {/* Church name left, FIRST VISIT pushed to right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          flexShrink: 0,
        }}
      >
        {data.churchName && (
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {data.churchName}
          </span>
        )}
        {data.isFirstTime && (
          <span
            style={{
              fontSize: 6.5,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            ★ FIRST VISIT
          </span>
        )}
      </div>

      {/* Child name */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          lineHeight: 1,
          color: "#000",
          wordBreak: "break-word",
          flexShrink: 0,
        }}
      >
        {data.childName}
      </div>

      {/* Room — tight to child name, same size as before */}
      {data.roomName && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            marginTop: 3,
            color: "#000",
            flexShrink: 0,
          }}
        >
          {data.roomName}
        </div>
      )}

      {/* Care info — directly below room, no boxes, single MEDICAL line */}
      {hasCare && (
        <div
          style={{
            marginTop: 8,
            fontSize: 7.5,
            lineHeight: 1.6,
            color: "#000",
            flexShrink: 0,
          }}
        >
          {data.allergies && (
            <div>
              <span style={{ fontWeight: 700 }}>⚠ ALLERGIES: </span>
              {data.allergies}
            </div>
          )}
          {combinedMedical && (
            <div>
              <span style={{ fontWeight: 700 }}>⚕ MEDICAL: </span>
              {combinedMedical}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChildClassicLabel({ data }: { data: SharedLabelData }) {
  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.09in 0.1in",
          gap: "0.06in",
          overflow: "hidden",
        }}
      >
        <ChildLabelLeft data={data} />

        {/* RIGHT: pickup code only */}
        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            minWidth: "0.9in",
          }}
        >
          <div
            style={{
              fontSize: 7,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1,
              marginBottom: 5,
            }}
          >
            PICKUP CODE
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              lineHeight: 1,
              color: "#000",
            }}
          >
            {data.securityCode}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChildSmartLabel({ data }: { data: SharedLabelData }) {
  const qrUrl =
    data.qrToken && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/children-ministry/scan/${data.qrToken}`
      : null;
  const showQr = !!(qrUrl && data.smartLabelQrEnabled);

  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.09in 0.1in",
          gap: "0.06in",
          overflow: "hidden",
        }}
      >
        <ChildLabelLeft data={data} />

        {/* RIGHT: QR above scan text, then pickup code */}
        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            minWidth: showQr ? "1in" : "0.9in",
          }}
        >
          {showQr && (
            <>
              <QRCodeImage value={qrUrl!} size={44} />
              <div
                style={{
                  fontSize: 6,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                  textAlign: "center",
                  marginTop: 4,
                  color: "#444",
                }}
              >
                SCAN FOR CARE INFO<br />
                AUTHORIZED STAFF ONLY
              </div>
              <div
                style={{
                  width: "80%",
                  borderTop: "1px solid #ccc",
                  margin: "5px 0 4px",
                }}
              />
            </>
          )}
          <div
            style={{
              fontSize: 7,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            PICKUP CODE
          </div>
          <div
            style={{
              fontSize: showQr ? 22 : 36,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              lineHeight: 1,
              color: "#000",
            }}
          >
            {data.securityCode}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ParentPickupLabel({ data }: { data: SharedLabelData }) {
  const parts = data.parentName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  const familyName = lastName.toUpperCase() + " FAMILY";

  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.09in 0.1in",
          gap: "0.07in",
          overflow: "hidden",
        }}
      >
        {/* LEFT: church, family name, children list */}
        <div
          className="label-left"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Church name left, FIRST TIME FAMILY pushed to right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 5,
              flexShrink: 0,
            }}
          >
            {data.churchName && (
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {data.churchName}
              </span>
            )}
            {data.isFirstTime && (
              <span
                style={{
                  fontSize: 6.5,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                ★ FIRST TIME FAMILY
              </span>
            )}
          </div>

          {/* Family name */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#000",
              wordBreak: "break-word",
              flexShrink: 0,
            }}
          >
            {familyName}
          </div>

          {/* Child rows: name bold left, room right — separate row per child */}
          <div style={{ marginTop: 7, flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 10,
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 700 }}>{data.childName}</span>
              {data.roomName && (
                <span style={{ fontWeight: 400, color: "#222" }}>{data.roomName}</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: pickup code + instruction */}
        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            minWidth: "1.05in",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 7,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            PICKUP CODE
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.04em",
              lineHeight: 1,
              color: "#000",
            }}
          >
            {data.securityCode}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 6,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
              color: "#000",
              textAlign: "center",
            }}
          >
            PRESENT THIS CODE<br />&amp; PHOTO ID TO PICK UP
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintLabel({ data }: { data: SharedLabelData }) {
  if (data.labelType === "parent") return <ParentPickupLabel data={data} />;
  if (data.labelMode === "smart") return <ChildSmartLabel data={data} />;
  return <ChildClassicLabel data={data} />;
}
