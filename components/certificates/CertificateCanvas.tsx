"use client";

import type { ReactNode } from "react";
import type { CertificateTemplate } from "@/lib/certificates/themes";
import CosmosBackground from "@/components/certificates/layers/CosmosBackground";
import BirthdayArtwork from "@/components/certificates/layers/BirthdayArtwork";
import PremiumFrame from "@/components/certificates/layers/PremiumFrame";

export interface CertificateCanvasProps {
  template: CertificateTemplate;
  certType?: string;
  churchName: string;
  churchTagline?: string;
  certificateTitle: string;
  certificateSubtitle?: string;
  childName: string;
  verse: string;
  reference: string;
  translation: "kjv" | "niv";
  blessing?: string;
  ministerName: string;
  ministerTitle: string;
  date: string;
  sealImageUrl?: string;
  artwork?: ReactNode;
}

const GOLD = "#D4AF37";
const LIGHT_GOLD = "#F8E6A0";
const DEEP_PURPLE = "#1C0A30";

function formatDate(value: string) {
  if (!value) return "";
  try {
    return new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return value;
  }
}

function CrossGlow({ template }: { template: CertificateTemplate }) {
  const ivory = template === "white";
  return (
    <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", width: 58, height: 72, zIndex: 20, filter: ivory ? "drop-shadow(0 2px 4px rgba(139,105,20,.18))" : "drop-shadow(0 0 8px rgba(255,255,255,.95)) drop-shadow(0 0 30px rgba(180,80,255,.72))" }} aria-hidden="true">
      <div style={{ position: "absolute", inset: "-16px -24px", background: ivory ? "radial-gradient(circle, rgba(212,175,55,.15), transparent 64%)" : "radial-gradient(circle, rgba(255,255,255,.20), rgba(157,78,221,.30) 38%, transparent 68%)" }} />
      <svg viewBox="0 0 80 96" style={{ position: "relative", width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="skCrossGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ivory ? "#FFF4B8" : "#FFFFFF"} />
            <stop offset="46%" stopColor={ivory ? "#D4AF37" : "#F5EEFF"} />
            <stop offset="100%" stopColor={ivory ? "#7A4A05" : "#B883FF"} />
          </linearGradient>
        </defs>
        <path d="M34 2h12v34h17v12H46v46H34V48H17V36h17z" fill="url(#skCrossGradient)" stroke={ivory ? "#8B6914" : "#F9E8FF"} strokeWidth="1.6" strokeLinejoin="miter" />
      </svg>
    </div>
  );
}

function MinistrySeal({ template, sealImageUrl }: { template: CertificateTemplate; sealImageUrl?: string }) {
  const ivory = template === "white";
  if (sealImageUrl) return <img src={sealImageUrl} alt="" style={{ width: 94, height: 94, objectFit: "contain", borderRadius: "50%", padding: 8, background: ivory ? "#FFF8E3" : "#12031D", border: `3px solid ${ivory ? "#8B6914" : LIGHT_GOLD}` }} />;
  return (
    <div style={{ width: 94, height: 94, borderRadius: "50%", background: ivory ? "radial-gradient(circle at 34% 26%, #FFF2B6 0%, #E9C75A 18%, #C99A22 42%, #8A5A0B 72%, #F3D46B 100%)" : "radial-gradient(circle at 50% 42%, #151018 0%, #060407 58%, #D4AF37 61%, #8A5A0B 75%, #F3D46B 100%)", border: "2px solid #F8E6A0", boxShadow: ivory ? "0 8px 18px rgba(90,60,10,.18)" : "0 10px 22px rgba(0,0,0,.55), 0 0 28px rgba(212,175,55,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ width: 60, height: 60 }}>
        <defs><linearGradient id="skCoinCross" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFF8C8" /><stop offset="42%" stopColor="#D4AF37" /><stop offset="100%" stopColor="#7A4A05" /></linearGradient></defs>
        <path d="M45 7h10v32h17v9H55v44H45V48H28v-9h17z" fill="url(#skCoinCross)" stroke="#5D3703" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function CertificateCanvas(props: CertificateCanvasProps) {
  const ivory = props.template === "white";
  const displayDate = formatDate(props.date);
  const nameSize = props.childName.length > 24 ? 88 : props.childName.length > 16 ? 102 : 116;
  const isBirthday = props.certType === "birthday" || props.certificateTitle.toLowerCase().includes("birthday");

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "11 / 8.5", overflow: "hidden", background: ivory ? "#FDFAEF" : "#000002", boxSizing: "border-box", border: ivory ? "6px solid #8B6914" : `6px solid ${GOLD}`, boxShadow: ivory ? "0 12px 34px rgba(0,0,0,.18)" : "0 18px 52px rgba(0,0,0,.58)", color: ivory ? DEEP_PURPLE : "#FFFFFF" }}>
      <CosmosBackground template={props.template} />
      <PremiumFrame template={props.template} />

      {isBirthday ? <><div style={{ position: "absolute", left: -18, top: 72, zIndex: 4, pointerEvents: "none" }}><BirthdayArtwork template={props.template} side="left" /></div><div style={{ position: "absolute", right: -18, top: 92, zIndex: 4, pointerEvents: "none" }}><BirthdayArtwork template={props.template} side="right" /></div></> : props.artwork ? <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>{props.artwork}</div> : null}

      <CrossGlow template={props.template} />

      <div style={{ position: "absolute", top: 108, left: "50%", transform: "translateX(-50%)", width: 650, zIndex: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 900, letterSpacing: ".145em", textTransform: "uppercase", color: ivory ? DEEP_PURPLE : LIGHT_GOLD, textShadow: ivory ? "0 1px 0 #FFF" : "0 2px 0 rgba(0,0,0,.45)" }}>{props.churchName}</div>
        {props.churchTagline ? <div style={{ marginTop: 7, fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", letterSpacing: ".055em", color: ivory ? "#7B5B17" : "rgba(248,230,160,.82)" }}>{props.churchTagline}</div> : null}
      </div>

      <div style={{ position: "absolute", top: 210, left: "50%", transform: "translateX(-50%)", width: "82%", zIndex: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 48, fontWeight: 900, lineHeight: 0.95, letterSpacing: ".065em", color: ivory ? "#3D145F" : GOLD, textShadow: ivory ? "0 1px 0 #FFF" : "0 2px 0 rgba(0,0,0,.55), 0 0 22px rgba(212,175,55,.18)", textTransform: "uppercase" }}>{props.certificateTitle}</div>
        {props.certificateSubtitle ? <div style={{ marginTop: 12, fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", letterSpacing: ".06em", color: ivory ? "#7B5B17" : "#F8E6A0" }}>{props.certificateSubtitle}</div> : null}
      </div>

      <div style={{ position: "absolute", top: 348, left: "50%", transform: "translateX(-50%)", zIndex: 22, width: "82%", textAlign: "center", fontFamily: "Georgia, serif", fontSize: nameSize, fontWeight: 900, fontStyle: "italic", lineHeight: 0.95, letterSpacing: ".015em", color: ivory ? "#2A0D43" : "#FFF0B8", textShadow: ivory ? "0 1px 0 #FFF" : "0 4px 0 rgba(0,0,0,.58), 0 0 48px rgba(212,175,55,.34), 0 0 92px rgba(255,240,170,.14)" }}>{props.childName}</div>

      {props.blessing ? <div style={{ position: "absolute", top: 462, left: "50%", transform: "translateX(-50%)", width: 720, zIndex: 20, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.46, fontStyle: "italic", color: ivory ? "#4E3B2A" : "rgba(255,255,255,.84)" }}>{props.blessing}</div> : null}

      <div style={{ position: "absolute", top: props.blessing ? 560 : 526, left: "50%", transform: "translateX(-50%)", width: 720, minHeight: 124, zIndex: 20, background: ivory ? "linear-gradient(180deg, rgba(255,252,240,.96), rgba(238,214,162,.88))" : "linear-gradient(180deg, rgba(42,13,64,.82), rgba(8,2,16,.94))", border: ivory ? "3px solid #B8860B" : `3px solid rgba(212,175,55,.74)`, boxShadow: ivory ? "0 10px 24px rgba(0,0,0,.14), inset 0 0 28px rgba(139,105,20,.08)" : "0 0 42px rgba(212,175,55,.22), inset 0 0 38px rgba(255,255,255,.04), inset 0 0 80px rgba(0,0,0,.24)", padding: "26px 62px", boxSizing: "border-box", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 8, border: ivory ? "1px solid rgba(139,105,20,.38)" : "1px solid rgba(248,230,160,.30)" }} />
        <p style={{ position: "relative", zIndex: 2, margin: "0 0 8px", color: ivory ? DEEP_PURPLE : "rgba(255,255,255,.90)", fontSize: 16, lineHeight: 1.42, fontFamily: "Georgia, serif" }}>“{props.verse}”</p>
        <p style={{ position: "relative", zIndex: 2, margin: 0, color: ivory ? "#7A5510" : GOLD, fontSize: 12, fontWeight: 900, fontFamily: "Georgia, serif", letterSpacing: ".14em", textTransform: "uppercase" }}>{props.reference} {props.translation.toUpperCase()}</p>
      </div>

      <div style={{ position: "absolute", left: 120, right: 120, bottom: 46, zIndex: 20, display: "grid", gridTemplateColumns: "1fr 140px 1fr", alignItems: "end", gap: 26 }}>
        <div style={{ textAlign: "left" }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 6 }}>Presented By</div><div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1, marginBottom: 5 }}>{props.ministerName}</div><div style={{ fontSize: 11, fontWeight: 800, color: ivory ? "#4E3B2A" : "rgba(255,255,255,.78)", textTransform: "uppercase" }}>{props.ministerTitle}</div></div>
        <div style={{ display: "flex", justifyContent: "center" }}><MinistrySeal template={props.template} sealImageUrl={props.sealImageUrl} /></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase", color: ivory ? "#8B6914" : GOLD, marginBottom: 7 }}>Date of Presentation</div><div style={{ fontFamily: "Georgia, serif", fontSize: 27, fontStyle: "italic", color: ivory ? "#3D145F" : "#FBE6A2", lineHeight: 1 }}>{displayDate}</div></div>
      </div>
    </div>
  );
}
