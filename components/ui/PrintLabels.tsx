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

const BASE: React.CSSProperties = {
  width: "4in",
  height: "2in",
  boxSizing: "border-box",
  overflow: "hidden",
  padding: "0.1in 0.12in",
  pageBreakAfter: "always",
  breakAfter: "page",
  fontFamily: "Arial, Helvetica, sans-serif",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#ffffff",
  color: "#000000",
};

function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        backgroundColor: "#000",
        color: "#fff",
        padding: "1px 5px",
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function RoomBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        border: "1.5px solid #000",
        padding: "1px 7px",
        borderRadius: 3,
        color: "#000",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function CareLine({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        fontSize: 8.5,
        color: "#000",
        border: "0.75px solid #000",
        padding: "1px 4px",
        borderRadius: 2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "2.8in",
      }}
    >
      <strong>{label}:</strong> {text}
    </div>
  );
}

const CODE_STYLE: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  fontFamily: "monospace",
  letterSpacing: "0.15em",
  lineHeight: 1,
  color: "#000",
};

const PARENT_CODE_STYLE: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  fontFamily: "monospace",
  letterSpacing: "0.18em",
  lineHeight: 1,
  color: "#000",
};

export function ChildClassicLabel({ data }: { data: SharedLabelData }) {
  return (
    <div style={BASE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <TypeBadge>Child Check-In</TypeBadge>
          {data.churchName && (
            <div style={{ fontSize: 8, color: "#555", marginTop: 2 }}>{data.churchName}</div>
          )}
        </div>
        {data.roomName && <RoomBadge>{data.roomName}</RoomBadge>}
      </div>

      {data.isFirstTime && (
        <div style={{ fontSize: 10, fontWeight: 900, color: "#000", marginTop: 3 }}>
          ★ FIRST VISIT
        </div>
      )}

      <div
        style={{
          fontSize: 23,
          fontWeight: 900,
          lineHeight: 1.1,
          marginTop: data.isFirstTime ? 2 : 5,
          color: "#000",
        }}
      >
        {data.childName}
      </div>

      {(data.allergies || data.medicalNotes || data.specialInstructions) && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          {data.allergies && <CareLine label="ALLERGIES" text={data.allergies} />}
          {data.medicalNotes && <CareLine label="MEDICAL" text={data.medicalNotes} />}
          {data.specialInstructions && <CareLine label="NOTES" text={data.specialInstructions} />}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          marginTop: "auto",
        }}
      >
        <div>
          <div style={{ fontSize: 8, textAlign: "right", color: "#555", marginBottom: 1 }}>
            PICKUP CODE
          </div>
          <div style={CODE_STYLE}>{data.securityCode}</div>
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
    <div style={BASE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <TypeBadge>Child Check-In</TypeBadge>
          {data.churchName && (
            <div style={{ fontSize: 8, color: "#555", marginTop: 2 }}>{data.churchName}</div>
          )}
        </div>
        {data.roomName && <RoomBadge>{data.roomName}</RoomBadge>}
      </div>

      {data.isFirstTime && (
        <div style={{ fontSize: 10, fontWeight: 900, color: "#000", marginTop: 3 }}>
          ★ FIRST VISIT
        </div>
      )}

      <div
        style={{
          fontSize: 23,
          fontWeight: 900,
          lineHeight: 1.1,
          marginTop: data.isFirstTime ? 2 : 5,
          color: "#000",
        }}
      >
        {data.childName}
      </div>

      {(data.allergies || data.medicalNotes || data.specialInstructions) && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          {data.allergies && <CareLine label="ALLERGIES" text={data.allergies} />}
          {data.medicalNotes && <CareLine label="MEDICAL" text={data.medicalNotes} />}
          {data.specialInstructions && <CareLine label="NOTES" text={data.specialInstructions} />}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "auto",
        }}
      >
        {showQr ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QRCodeImage value={qrUrl!} size={48} />
            <div
              style={{
                fontSize: 7,
                color: "#555",
                marginTop: 2,
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              SCAN FOR
              <br />
              COMPLETE CARE INFO
            </div>
          </div>
        ) : (
          <div />
        )}
        <div>
          <div style={{ fontSize: 8, textAlign: "right", color: "#555", marginBottom: 1 }}>
            PICKUP CODE
          </div>
          <div style={CODE_STYLE}>{data.securityCode}</div>
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
    <div style={BASE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <TypeBadge>Parent Pickup</TypeBadge>
        {data.churchName && (
          <span style={{ fontSize: 8, color: "#555" }}>{data.churchName}</span>
        )}
      </div>

      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          color: "#000",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginTop: 3,
        }}
      >
        Present This Code &amp; Photo ID
      </div>

      {data.isFirstTime && (
        <div style={{ fontSize: 10, fontWeight: 900, color: "#000", marginTop: 2 }}>
          ★ FIRST TIME FAMILY
        </div>
      )}

      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          lineHeight: 1.1,
          marginTop: data.isFirstTime ? 2 : 4,
          color: "#000",
        }}
      >
        {familyName}
      </div>

      <div style={{ fontSize: 11, color: "#333", marginTop: 3, lineHeight: 1.3 }}>
        {data.childName}
      </div>

      <div style={{ marginTop: "auto", borderTop: "1.5px solid #000", paddingTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 7, color: "#555", lineHeight: 1.3 }}>
              Code changes every service
            </div>
            <div style={{ fontSize: 6.5, color: "#777", marginTop: 1, lineHeight: 1.3 }}>
              Thank you for helping us keep your children safe
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: "#555", marginBottom: 1 }}>PICKUP CODE</div>
            <div style={PARENT_CODE_STYLE}>{data.securityCode}</div>
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
