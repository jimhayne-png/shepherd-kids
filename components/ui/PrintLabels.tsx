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
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        border: 2px solid #000 !important;
        border-radius: 6px !important;
        background: #fff !important;
        font-family: Arial, Helvetica, sans-serif !important;
        page-break-after: always !important;
      }
      .label-grid {
        display: grid !important;
        flex: 1 !important;
        overflow: hidden !important;
      }
      .label-col {
        display: flex !important;
        flex-direction: column !important;
        padding: 0.06in 0.07in !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .label-footer {
        background-color: #000 !important;
        color: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .care-box {
        border: 1px solid #000 !important;
        border-radius: 2px !important;
        padding: 2px 4px !important;
        margin-bottom: 4px !important;
      }
      .authorized-box {
        background-color: #e0e0e0 !important;
        border-radius: 4px !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .first-visit-badge {
        background-color: #000 !important;
        color: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `}</style>
  );
}

function ChildLeftCol({
  churchName,
  isFirstTime,
}: {
  churchName: string;
  isFirstTime: boolean;
}) {
  return (
    <div
      className="label-col"
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
          className="first-visit-badge"
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
      className="care-box"
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
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      <div
        className="label-grid"
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
          className="label-col"
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
          className="label-col"
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
          className="label-col"
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
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      <div
        className="label-grid"
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
          className="label-col"
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
          className="label-col"
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
          className="label-col"
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
    <div className="label-wrap" style={LABEL_WRAP}>
      <PrintStyles />
      {/* 3-column main body */}
      <div
        className="label-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "25% 50% 25%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* LEFT: SVG Cross+Hill + Church Name + Shield + Pickup Instruction */}
        <div
          className="label-col"
          style={{
            ...COL,
            borderRight: "1.5px solid #000",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            rowGap: "4px",
          }}
        >
          {/* Cross with hill/arch */}
          <svg
            width="28"
            height="24"
            viewBox="0 0 28 24"
            style={{ display: "block" }}
          >
            <rect x="12" y="0" width="4" height="16" fill="black" />
            <rect x="4" y="5" width="20" height="4" fill="black" />
            <path d="M1 24 C1 24 4 15 14 15 C24 15 27 24 27 24 Z" fill="black" />
          </svg>

          {/* Church name: large bold uppercase, wraps to two lines */}
          {data.churchName && (
            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
              }}
            >
              {data.churchName}
            </div>
          )}

          {/* Shield icon + pickup instruction */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
              marginTop: 2,
            }}
          >
            <svg
              width="8"
              height="10"
              viewBox="0 0 8 10"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <path
                d="M4 0 L8 2 L8 5.5 C8 7.8 6.3 9.2 4 10 C1.7 9.2 0 7.8 0 5.5 L0 2 Z"
                fill="black"
              />
            </svg>
            <div
              style={{
                fontSize: 5.5,
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 1.35,
                letterSpacing: "0.03em",
                textAlign: "left",
              }}
            >
              PRESENT THIS CODE &amp; PHOTO ID TO PICK UP
            </div>
          </div>
        </div>

        {/* CENTER: First Time badge + Family name + divider + child rows + auth box */}
        {/* NOTE: no label-col here — label-col forces padding that would break the full-width badge */}
        <div
          style={{
            borderRight: "1.5px solid #000",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* First Time Family: full-width black bar */}
          {data.isFirstTime && (
            <div
              className="first-visit-badge"
              style={{
                backgroundColor: "#000",
                color: "#fff",
                fontSize: 7,
                fontWeight: 900,
                textTransform: "uppercase",
                textAlign: "center",
                padding: "3px 6px",
                letterSpacing: "0.06em",
                flexShrink: 0,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              ★ FIRST TIME FAMILY
            </div>
          )}

          {/* Inner content */}
          <div
            style={{
              padding: "5px 7px 4px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              justifyContent: "center",
            }}
          >
            {/* Family name: very large bold */}
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.05,
                color: "#000",
                wordBreak: "break-word",
              }}
            >
              {familyName}
            </div>

            {/* Horizontal divider */}
            <div
              style={{
                borderTop: "1px solid #000",
                margin: "4px 0 3px",
                flexShrink: 0,
              }}
            />

            {/* Child row: CHILD NAME left, ROOM right */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: "#000",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {data.childName}
              </div>
              {data.roomName && (
                <div
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "#000",
                    flexShrink: 0,
                  }}
                >
                  {data.roomName}
                </div>
              )}
            </div>

            {/* Authorized pickups: grey rounded box */}
            <div
              className="authorized-box"
              style={{
                backgroundColor: "#e0e0e0",
                borderRadius: 4,
                padding: "3px 5px",
                marginTop: 5,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              {/* People icon */}
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                style={{ flexShrink: 0 }}
              >
                <circle cx="3.5" cy="2.5" r="2" fill="#000" />
                <circle cx="8.5" cy="2.5" r="2" fill="#000" />
                <ellipse cx="3.5" cy="8.5" rx="3.5" ry="2" fill="#000" />
                <ellipse cx="8.5" cy="8.5" rx="3.5" ry="2" fill="#000" />
              </svg>
              <div>
                <div
                  style={{
                    fontSize: 6.5,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 1.2,
                    color: "#000",
                  }}
                >
                  AUTHORIZED PICKUPS
                </div>
                <div
                  style={{
                    fontSize: 6,
                    color: "#444",
                    lineHeight: 1.2,
                  }}
                >
                  See staff with any questions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PICKUP CODE label + divider + large code + divider + shield + safety text */}
        <div
          className="label-col"
          style={{
            ...COL,
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "center",
            padding: "6px 4px",
          }}
        >
          {/* PICKUP CODE label */}
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

          {/* Divider */}
          <div
            style={{
              borderTop: "1px solid #000",
              width: "100%",
              margin: "3px 0",
            }}
          />

          {/* Security code: very large */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.02em",
              lineHeight: 1,
              color: "#000",
            }}
          >
            {data.securityCode}
          </div>

          {/* Divider */}
          <div
            style={{
              borderTop: "1px solid #000",
              width: "100%",
              margin: "3px 0",
            }}
          />

          {/* Shield/lock icon + safety text */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <svg
              width="8"
              height="10"
              viewBox="0 0 8 10"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <path
                d="M4 0 L8 2 L8 5.5 C8 7.8 6.3 9.2 4 10 C1.7 9.2 0 7.8 0 5.5 L0 2 Z"
                fill="black"
              />
              <rect x="2.5" y="5" width="3" height="2.5" rx="0.4" fill="white" />
              <path
                d="M3 5 L3 3.5 Q4 2.5 5 3.5 L5 5"
                fill="none"
                stroke="white"
                strokeWidth="0.7"
              />
            </svg>
            <div
              style={{
                fontSize: 5.5,
                textAlign: "left",
                lineHeight: 1.35,
                letterSpacing: "0.02em",
                color: "#000",
              }}
            >
              This code changes daily for your child&apos;s safety
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: full-width black bar with heart icon */}
      <div
        className="label-footer"
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <svg
          width="10"
          height="9"
          viewBox="0 0 10 9"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M5 8.5 C4.5 8 0 5.5 0 3 C0 1.3 1.2 0 2.7 0 C3.6 0 4.4 0.5 5 1.2 C5.6 0.5 6.4 0 7.3 0 C8.8 0 10 1.3 10 3 C10 5.5 5.5 8 5 8.5 Z"
            fill="white"
          />
        </svg>
        THANK YOU FOR HELPING US KEEP YOUR CHILDREN SAFE!
      </div>
    </div>
  );
}

export function PrintLabel({ data }: { data: SharedLabelData }) {
  if (data.labelType === "parent") return <ParentPickupLabel data={data} />;
  if (data.labelMode === "smart") return <ChildSmartLabel data={data} />;
  return <ChildClassicLabel data={data} />;
}
