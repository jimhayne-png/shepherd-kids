"use client";

import type { CertificateData } from "../types";

export default function CertificateText({ data }: { data: CertificateData }) {
  const churchName =
    "churchName" in data && data.churchName
      ? String(data.churchName)
      : "LIGHTHOUSE BAPTIST CHURCH";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "grid",
        gridTemplateRows:
          "82px 34px 48px 106px 48px 72px 88px 46px 94px 88px",
        justifyItems: "center",
        alignItems: "center",
        color: "#fff",
      }}
    >
      <div
        style={{
          gridRow: 3,
          marginTop: "4px",
          fontFamily: "Georgia, serif",
          fontSize: "15px",
          letterSpacing: ".24em",
          color: "rgba(255,255,255,.96)",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,.55)",
        }}
      >
        {churchName}
      </div>

      <div
        style={{
          gridRow: 4,
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: "94px",
          lineHeight: ".84",
          color: "#D4AF37",
          textShadow:
            "0 2px 0 #8b6508, 0 5px 10px rgba(0,0,0,.45), 0 0 14px rgba(212,175,55,.18)",
          transform: "rotate(-1deg)",
        }}
      >
        Happy Birthday!
      </div>

      <div
        style={{
          gridRow: 5,
          display: "flex",
          alignItems: "center",
          width: "74%",
          gap: 14,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(212,175,55,.75))",
          }}
        />

        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "Georgia, serif",
            fontSize: "17px",
            letterSpacing: ".11em",
          }}
        >
          CELEBRATING GOD&apos;S AMAZING GIFT OF YOU
        </div>

        <div
          style={{
            flex: 1,
            height: 1,
            background:
              "linear-gradient(to left, transparent, rgba(212,175,55,.75))",
          }}
        />
      </div>

      <div
        style={{
          gridRow: 6,
          width: "54%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: "16px",
          lineHeight: 1.48,
        }}
      >
        This certificate celebrates the wonderful gift of you
        <br />
        and the joy you bring to our church family.
      </div>

      <div
        style={{
          gridRow: 7,
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: "84px",
          lineHeight: ".86",
          color: "#D4AF37",
          textShadow: "0 2px 0 #7c5607, 0 4px 8px rgba(0,0,0,.4)",
        }}
      >
        {data.childName}
      </div>

      <div
        style={{
          gridRow: 8,
          width: "74%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: "#D4AF37",
          lineHeight: 1.25,
          marginTop: "-10px",
        }}
      >
        May God bless you today and always as you grow in His love!
      </div>

      <div
        style={{
          gridRow: 9,
          width: "78%",
          display: "grid",
          gridTemplateColumns: "1fr 138px 1fr",
          alignItems: "end",
          columnGap: 26,
          marginTop: "18px",
          transform: "translateY(6px)",
        }}
      >
        <div
          style={{
            justifySelf: "center",
            textAlign: "center",
            minWidth: 215,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "18px",
              color: "#ffffff",
              letterSpacing: ".02em",
              paddingBottom: 6,
              borderBottom: "1px solid rgba(212,175,55,.82)",
            }}
          >
            {data.date || "April 14, 2026"}
          </div>

          <div
            style={{
              marginTop: 5,
              fontFamily: "Georgia, serif",
              fontSize: "12px",
              letterSpacing: ".18em",
              color: "rgba(255,255,255,.92)",
              textTransform: "uppercase",
            }}
          >
            Date
          </div>
        </div>

        <div />

        <div
          style={{
            justifySelf: "center",
            textAlign: "center",
            minWidth: 260,
          }}
        >
          <div
            style={{
              fontFamily: "Brush Script MT, Segoe Script, cursive",
              fontSize: "28px",
              lineHeight: 1,
              color: "#F7F0DD",
              paddingBottom: 5,
              borderBottom: "1px solid rgba(212,175,55,.82)",
              textShadow: "0 2px 8px rgba(0,0,0,.6)",
            }}
          >
            Children&apos;s Ministry
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily: "Georgia, serif",
              fontSize: "12px",
              letterSpacing: ".18em",
              color: "rgba(255,255,255,.92)",
              textTransform: "uppercase",
            }}
          >
            Director
          </div>
        </div>
      </div>
    </div>
  );
}