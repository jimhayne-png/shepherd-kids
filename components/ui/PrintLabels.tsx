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
  backgroundColor: "#ffffff",
  color: "#000000",
  border: "2px solid #000",
  borderRadius: 6,
  display: "flex",
  flexDirection: "column",
};

const COL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "0.06in 0.07in",
  overflow: "hidden",
  boxSizing: "border-box",
};

function ChildLeftCol({
  churchName,
  isFirstTime,
}: {
  churchName: string;
  isFirstTime: boolean;
}) {
  return (
    <div
      style={{
        ...COL,
        borderRight: "1.5px solid #000",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        rowGap: "4px",
      }}
    >
      <div style={{ fontSize: 20, lineHeight: 1 }}>✝</div>
      {churchName && (
        <div
          style={{
            fontSize: 7.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
        >
          {churchName}
        </div>
      )}
      {isFirstTime && (
        <div
          style={{
            fontSize: 6.5,
            fontWeight: 900,
            textTransform: "uppercase",
            backgroundColor: "#000",
            color: "#fff",
            padding: "2px 4px",
            borderRadius: 2,
            letterSpacing: "0.04em",
          }}
        >
          ★ FIRST VISIT
        </div>
      )}
    </div>
  );
}

function CareBox({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid #000",
        borderRadius: 2,
        padding: "2px 4px",
        marginBottom: 4,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 6.5,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 8,
          lineHeight: 1.25,
          marginTop: 1,
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function PickupCode({ code, size }: { code: string; size: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 7,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          lineHeight: 1,
        }}
      >
        PICKUP CODE
      </div>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          fontFamily: "monospace",
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          marginTop: 3,
          color: "#000",
        }}
      >
        {code}
      </div>
    </div>
  );
}

export function ChildClassicLabel({ data }: { data: SharedLabelData }) {
  const hasCare = !!(
    data.allergies ||
    data.medicalNotes ||
    data.specialInstructions
  );

  return (
    <div style={LABEL_WRAP}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "22% 28% 30% 20%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* LEFT: Church cross + First Visit badge */}
        <ChildLeftCol
          churchName={data.churchName}
          isFirstTime={data.isFirstTime}
        />

        {/* CENTER: Child name + Room */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 19,
              fontWeight: 900,
              lineHeight: 1.1,
              color: "#000",
              wordBreak: "break-word",
            }}
          >
            {data.childName}
          </div>
          {data.roomName && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                marginTop: 6,
                color: "#000",
              }}
            >
              {data.roomName}
            </div>
          )}
        </div>

        {/* CARE: Bordered allergy + medical boxes */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            justifyContent: "center",
          }}
        >
          {hasCare && (
            <>
              {data.allergies && (
                <CareBox label="Allergies" text={data.allergies} />
              )}
              {data.medicalNotes && (
                <CareBox label="Medical" text={data.medicalNotes} />
              )}
              {data.specialInstructions && (
                <CareBox label="Notes" text={data.specialInstructions} />
              )}
            </>
          )}
        </div>

        {/* RIGHT: Lock icon + Pickup Code (no instruction text) */}
        <div
          style={{
            ...COL,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 16, marginBottom: 4, lineHeight: 1 }}>🔒</div>
          <PickupCode code={data.securityCode} size={18} />
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
  const hasCare = !!(
    data.allergies ||
    data.medicalNotes ||
    data.specialInstructions
  );

  return (
    <div style={LABEL_WRAP}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "22% 28% 30% 20%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* LEFT: Church cross + First Visit badge */}
        <ChildLeftCol
          churchName={data.churchName}
          isFirstTime={data.isFirstTime}
        />

        {/* CENTER: Child name + Room */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 19,
              fontWeight: 900,
              lineHeight: 1.1,
              color: "#000",
              wordBreak: "break-word",
            }}
          >
            {data.childName}
          </div>
          {data.roomName && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                marginTop: 6,
                color: "#000",
              }}
            >
              {data.roomName}
            </div>
          )}
        </div>

        {/* CARE: Allergies + Medical printed directly (not hidden behind QR) */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            justifyContent: "center",
          }}
        >
          {hasCare && (
            <>
              {data.allergies && (
                <CareBox label="Allergies" text={data.allergies} />
              )}
              {data.medicalNotes && (
                <CareBox label="Medical" text={data.medicalNotes} />
              )}
              {data.specialInstructions && (
                <CareBox label="Notes" text={data.specialInstructions} />
              )}
            </>
          )}
        </div>

        {/* RIGHT: Smart label QR + Pickup Code */}
        <div
          style={{
            ...COL,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showQr ? (
            <>
              <div
                style={{
                  fontSize: 6,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  textAlign: "center",
                  lineHeight: 1,
                  marginBottom: 2,
                }}
              >
                SMART LABEL
              </div>
              <QRCodeImage value={qrUrl!} size={42} />
              <div
                style={{
                  fontSize: 5.5,
                  textAlign: "center",
                  lineHeight: 1.2,
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                SCAN FOR COMPLETE
                <br />
                CARE INFO
              </div>
              <div
                style={{
                  fontSize: 5,
                  textAlign: "center",
                  fontWeight: 700,
                  marginTop: 1,
                  textTransform: "uppercase",
                }}
              >
                AUTHORIZED STAFF ONLY
              </div>
              <div
                style={{
                  width: "90%",
                  borderTop: "0.75px solid #000",
                  margin: "3px 0",
                }}
              />
              <PickupCode code={data.securityCode} size={14} />
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, marginBottom: 4, lineHeight: 1 }}>🔒</div>
              <PickupCode code={data.securityCode} size={18} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ParentPickupLabel({ data }: { data: SharedLabelData }) {
  const parts = data.parentName.trim().split(/\s+/);
  const lastName =
    parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  const familyName = lastName.toUpperCase() + " FAMILY";

  return (
    <div style={LABEL_WRAP}>
      {/* 3-column main body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "25% 50% 25%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* LEFT: Church + pickup instruction */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, lineHeight: 1 }}>✝</div>
          {data.churchName && (
            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                marginTop: 3,
              }}
            >
              {data.churchName}
            </div>
          )}
          <div
            style={{
              fontSize: 6.5,
              fontWeight: 900,
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 1.4,
              marginTop: 6,
              letterSpacing: "0.03em",
            }}
          >
            PRESENT THIS CODE &amp; PHOTO ID TO PICK UP
          </div>
        </div>

        {/* CENTER: First Time badge + Family name + Children list */}
        <div
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            justifyContent: "center",
          }}
        >
          {data.isFirstTime && (
            <div
              style={{
                fontSize: 7,
                fontWeight: 900,
                textTransform: "uppercase",
                backgroundColor: "#000",
                color: "#fff",
                padding: "2px 5px",
                borderRadius: 2,
                letterSpacing: "0.04em",
                alignSelf: "flex-start",
                marginBottom: 5,
              }}
            >
              ★ FIRST TIME FAMILY
            </div>
          )}
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1.1,
              color: "#000",
              wordBreak: "break-word",
            }}
          >
            {familyName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#333",
              marginTop: 5,
              lineHeight: 1.4,
            }}
          >
            {data.childName}
          </div>
        </div>

        {/* RIGHT: Pickup code + "Code changes every service" */}
        <div
          style={{
            ...COL,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PickupCode code={data.securityCode} size={20} />
          <div
            style={{
              fontSize: 6.5,
              color: "#555",
              textAlign: "center",
              marginTop: 6,
              lineHeight: 1.3,
            }}
          >
            Code changes
            <br />
            every service
          </div>
        </div>
      </div>

      {/* Footer: full-width black bar */}
      <div
        style={{
          backgroundColor: "#000",
          color: "#fff",
          textAlign: "center",
          fontSize: 7.5,
          fontWeight: 700,
          padding: "3px 8px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          flexShrink: 0,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        Thank you for helping us keep your children safe!
      </div>
    </div>
  );
}

export function PrintLabel({ data }: { data: SharedLabelData }) {
  if (data.labelType === "parent") return <ParentPickupLabel data={data} />;
  if (data.labelMode === "smart") return <ChildSmartLabel data={data} />;
  return <ChildClassicLabel data={data} />;
}
