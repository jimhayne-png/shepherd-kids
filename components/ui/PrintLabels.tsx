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
  notPottyTrained: boolean;
  isFirstTime: boolean;
  churchName: string;
  qrToken: string | null;
  labelMode: "smart" | "classic";
  smartLabelQrEnabled: boolean;
};

const LABEL_WRAP: React.CSSProperties = {
  width: "2.4in",
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
        @page { size: 2.4in 2in landscape; margin: 0; }
        body { margin: 0; padding: 0; }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }

      .label-wrap {
        width: 2.4in !important;
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

function hasText(value: string | null): boolean {
  return !!value?.trim();
}

function CareLine({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!hasText(value)) {
    return null;
  }

  return (
    <div
      style={{
        fontSize: 7,
        lineHeight: 1.18,
        color: "#000",
        marginTop: 2,
        overflowWrap: "anywhere",
      }}
    >
      <span
        style={{
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        {label}:
      </span>{" "}
      <span style={{ fontWeight: 700 }}>
        {value!.trim()}
      </span>
    </div>
  );
}

function PottyTrainingLine() {
  return (
    <div
      style={{
        fontSize: 7,
        lineHeight: 1.18,
        color: "#000",
        marginTop: 2,
        fontWeight: 900,
        textTransform: "uppercase",
        overflowWrap: "anywhere",
      }}
    >
      NOT POTTY TRAINED
    </div>
  );
}

function ChildHeader({
  data,
}: {
  data: SharedLabelData;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        marginBottom: 2,
        flexShrink: 0,
      }}
    >
      {data.churchName ? (
        <span
          style={{
            fontSize: 5.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.churchName}
        </span>
      ) : (
        <span />
      )}

      {data.isFirstTime && (
        <span
          style={{
            fontSize: 5.5,
            fontWeight: 900,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          ★ FIRST VISIT
        </span>
      )}
    </div>
  );
}

function ChildNameAndRoom({
  data,
  compact = false,
}: {
  data: SharedLabelData;
  compact?: boolean;
}) {
  return (
    <>
      <div
        style={{
          fontSize: compact ? 23 : 25,
          fontWeight: 900,
          lineHeight: 0.95,
          color: "#000",
          wordBreak: "break-word",
          flexShrink: 0,
        }}
      >
        {data.childName}
      </div>

      {data.roomName && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            marginTop: 2,
            color: "#000",
            flexShrink: 0,
          }}
        >
          {data.roomName}
        </div>
      )}
    </>
  );
}

function PickupCode({
  securityCode,
  compact = false,
}: {
  securityCode: string;
  compact?: boolean;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 5.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1,
          marginBottom: 3,
          whiteSpace: "nowrap",
        }}
      >
        PICKUP CODE
      </div>

      <div
        style={{
          fontSize: compact ? 20 : 22,
          fontWeight: 900,
          fontFamily: "monospace",
          letterSpacing: "0.03em",
          lineHeight: 1,
          color: "#000",
          whiteSpace: "nowrap",
        }}
      >
        {securityCode}
      </div>
    </>
  );
}

export function ChildClassicLabel({
  data,
}: {
  data: SharedLabelData;
}) {
  const hasCare =
    hasText(data.allergies) ||
    hasText(data.medicalNotes) ||
    hasText(data.specialInstructions) ||
    data.notPottyTrained;

  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />

      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.07in 0.07in",
          gap: "0.04in",
          overflow: "hidden",
        }}
      >
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
          <ChildHeader data={data} />

          <ChildNameAndRoom
            data={data}
            compact={hasCare}
          />

          {hasCare && (
            <div
              style={{
                marginTop: 4,
                paddingTop: 3,
                borderTop: "1.5px solid #000",
                overflow: "hidden",
              }}
            >
              <CareLine
                label="ALLERGIES"
                value={data.allergies}
              />

              <CareLine
                label="MEDICAL"
                value={data.medicalNotes}
              />

              <CareLine
                label="SPECIAL"
                value={data.specialInstructions}
              />

              {data.notPottyTrained && (
                <PottyTrainingLine />
              )}
            </div>
          )}
        </div>

        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: "0.72in",
            minWidth: "0.72in",
            borderLeft: "1px solid #bbb",
            paddingLeft: "0.035in",
          }}
        >
          <PickupCode
            securityCode={data.securityCode}
            compact={hasCare}
          />
        </div>
      </div>
    </div>
  );
}

export function ChildSmartLabel({
  data,
}: {
  data: SharedLabelData;
}) {
  const qrUrl =
    data.qrToken && typeof window !== "undefined"
      ? `${window.location.origin}/kiosk/scan/${data.qrToken}`
      : null;

  const showQr = !!(
    qrUrl &&
    data.smartLabelQrEnabled
  );

  const hasCare =
    hasText(data.allergies) ||
    hasText(data.medicalNotes) ||
    hasText(data.specialInstructions) ||
    data.notPottyTrained;

  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />

      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.07in 0.07in",
          gap: "0.04in",
          overflow: "hidden",
        }}
      >
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
          <ChildHeader data={data} />

          <ChildNameAndRoom
            data={data}
            compact={showQr}
          />

          {hasCare && (
            <div
              style={{
                marginTop: 5,
                fontSize: 6.5,
                fontWeight: 900,
                lineHeight: 1.15,
                color: "#000",
                letterSpacing: "0.02em",
              }}
            >
              ⚕ SEE CARE INFO
            </div>
          )}
        </div>

        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: showQr ? "0.82in" : "0.72in",
            minWidth: showQr ? "0.82in" : "0.72in",
            borderLeft: "1px solid #bbb",
            paddingLeft: "0.035in",
          }}
        >
          {showQr && (
            <>
              <QRCodeImage
                value={qrUrl!}
                size={48}
              />

              <div
                style={{
                  fontSize: 5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  lineHeight: 1.15,
                  textAlign: "center",
                  marginTop: 2,
                  color: "#000",
                }}
              >
                SCAN FOR CARE INFO
              </div>

              <div
                style={{
                  width: "80%",
                  borderTop: "1px solid #bbb",
                  margin: "3px 0",
                }}
              />
            </>
          )}

          <PickupCode
            securityCode={data.securityCode}
            compact={showQr}
          />
        </div>
      </div>
    </div>
  );
}

export function ParentPickupLabel({
  data,
}: {
  data: SharedLabelData;
}) {
  const parts = data.parentName
    .trim()
    .split(/\s+/);

  const lastName =
    parts.length > 1
      ? parts[parts.length - 1]
      : parts[0] ?? "";

  const familyName =
    lastName.toUpperCase() + " FAMILY";

  return (
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />

      <div
        className="label-body"
        style={{
          display: "flex",
          height: "100%",
          padding: "0.07in 0.07in",
          gap: "0.04in",
          overflow: "hidden",
        }}
      >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              marginBottom: 4,
              flexShrink: 0,
            }}
          >
            {data.churchName ? (
              <span
                style={{
                  fontSize: 5.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {data.churchName}
              </span>
            ) : (
              <span />
            )}

            {data.isFirstTime && (
              <span
                style={{
                  fontSize: 5,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                ★ FIRST TIME
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: 19,
              fontWeight: 900,
              lineHeight: 1,
              color: "#000",
              wordBreak: "break-word",
              flexShrink: 0,
            }}
          >
            {familyName}
          </div>

          <div
            style={{
              marginTop: 7,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 9,
                lineHeight: 1.25,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                }}
              >
                {data.childName}
              </span>

              {data.roomName && (
                <span
                  style={{
                    fontWeight: 400,
                    color: "#000",
                    marginTop: 2,
                  }}
                >
                  {data.roomName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className="label-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: "0.78in",
            minWidth: "0.78in",
            textAlign: "center",
            borderLeft: "1px solid #bbb",
            paddingLeft: "0.035in",
          }}
        >
          <PickupCode
            securityCode={data.securityCode}
          />

          <div
            style={{
              marginTop: 7,
              fontSize: 5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              lineHeight: 1.25,
              color: "#000",
              textAlign: "center",
            }}
          >
            PRESENT CODE
            <br />
            &amp; PHOTO ID
            <br />
            TO PICK UP
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintLabel({
  data,
}: {
  data: SharedLabelData;
}) {
  if (data.labelType === "parent") {
    return <ParentPickupLabel data={data} />;
  }

  if (data.labelMode === "smart") {
    return <ChildSmartLabel data={data} />;
  }

  return <ChildClassicLabel data={data} />;
}