"use client";

import React from "react";
import type { CertificateTemplate } from "@/lib/certificates/themes";

const GOLD = "#D4AF37";
const LIGHT = "#F8E6A0";

export default function LuxuryBorder({
  template,
}: {
  template: CertificateTemplate;
}) {
  const ivory = template === "white";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: ivory ? "8px solid #8B6914" : "8px solid #D4AF37",
          boxSizing: "border-box",
          boxShadow: ivory
            ? "inset 0 0 30px rgba(0,0,0,.08)"
            : "inset 0 0 50px rgba(212,175,55,.10)",
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 14,
          border: ivory ? "3px solid #D4AF37" : "3px solid #F8E6A0",
          boxSizing: "border-box",
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 30,
          border: ivory
            ? "1px solid rgba(139,105,20,.45)"
            : "1px solid rgba(212,175,55,.35)",
          boxSizing: "border-box",
          zIndex: 5,
        }}
      />

      {["tl","tr","bl","br"].map((c)=>(
        <div key={c}
          style={{
            position:"absolute",
            width:96,
            height:96,
            zIndex:8,
            ...(c=="tl" and {} )
          }}
        />
      ))}

      <svg
        viewBox="0 0 1100 850"
        preserveAspectRatio="none"
        style={{
          position:"absolute",
          inset:0,
          width:"100%",
          height:"100%",
          pointerEvents:"none",
          zIndex:7
        }}
      >
        <defs>
          <linearGradient id="goldBorder" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF6C5"/>
            <stop offset="30%" stopColor={LIGHT}/>
            <stop offset="55%" stopColor={GOLD}/>
            <stop offset="100%" stopColor="#7B5B17"/>
          </linearGradient>
        </defs>

        <rect x="9" y="9" width="1082" height="832"
          fill="none"
          stroke="url(#goldBorder)"
          strokeWidth="2"/>

        <path
          d="M95 60 H1005 M95 790 H1005 M60 95 V755 M1040 95 V755"
          stroke="url(#goldBorder)"
          strokeOpacity=".45"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </>
  );
}
