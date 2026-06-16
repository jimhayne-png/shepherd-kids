"use client";

import type { CSSProperties } from "react";
import type { CertificateTemplate } from "@/lib/certificates/themes";

export default function CosmosBackground({ template }: { template: CertificateTemplate }) {
  const ivory = template === "white";

  if (ivory) {
    return (
      <>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,.96) 0%, rgba(253,250,239,.98) 44%, rgba(234,214,165,.98) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.22, backgroundImage: "radial-gradient(circle at 18% 20%, rgba(139,105,20,.30) 0 .9px, transparent 1.8px), radial-gradient(circle at 82% 72%, rgba(212,175,55,.28) 0 .9px, transparent 1.8px)", backgroundSize: "140px 105px, 190px 145px" }} />
      </>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "#000002" }} />
      <div style={{ position: "absolute", inset: "-12%", pointerEvents: "none", opacity: 0.98, background: `radial-gradient(ellipse at 7% 40%, rgba(177,66,255,.62), transparent 16%), radial-gradient(ellipse at 17% 58%, rgba(86,16,150,.54), transparent 24%), radial-gradient(ellipse at 93% 38%, rgba(177,66,255,.58), transparent 16%), radial-gradient(ellipse at 82% 58%, rgba(86,16,150,.52), transparent 24%), radial-gradient(ellipse at 50% 96%, rgba(177,66,255,.30), transparent 30%)`, filter: "blur(18px)", mixBlendMode: "screen" } as CSSProperties} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.68, background: `linear-gradient(118deg, transparent 0%, transparent 10%, rgba(172,54,255,.28) 18%, transparent 34%, transparent 100%), linear-gradient(242deg, transparent 0%, transparent 12%, rgba(172,54,255,.25) 23%, transparent 40%, transparent 100%), radial-gradient(ellipse at 12% 82%, rgba(244,97,255,.28), transparent 18%), radial-gradient(ellipse at 88% 82%, rgba(244,97,255,.26), transparent 18%)`, filter: "blur(3px)", mixBlendMode: "screen" } as CSSProperties} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.9, backgroundImage: `radial-gradient(circle at 7% 14%, rgba(255,236,170,.98) 0 .65px, transparent 1.45px), radial-gradient(circle at 17% 62%, rgba(198,92,255,.96) 0 .75px, transparent 1.55px), radial-gradient(circle at 30% 24%, rgba(255,255,220,.92) 0 .60px, transparent 1.35px), radial-gradient(circle at 58% 18%, rgba(198,92,255,.90) 0 .70px, transparent 1.45px), radial-gradient(circle at 84% 26%, rgba(255,236,170,.94) 0 .65px, transparent 1.45px), radial-gradient(circle at 92% 78%, rgba(198,92,255,.92) 0 .75px, transparent 1.55px), radial-gradient(circle at 53% 82%, rgba(255,236,170,.76) 0 .60px, transparent 1.35px), radial-gradient(circle at 44% 46%, rgba(255,255,255,.50) 0 .50px, transparent 1.2px)`, backgroundSize: "64px 48px, 92px 70px, 82px 62px, 124px 94px, 108px 82px, 142px 106px, 132px 98px, 76px 57px" }} />
      <StarFlare left="12%" top="21%" color="#FFF2B8" glow="rgba(255,210,100,.86)" size={62} />
      <StarFlare left="24%" bottom="22%" color="#D081FF" glow="rgba(185,75,255,.90)" size={54} />
      <StarFlare right="13%" top="28%" color="#D081FF" glow="rgba(185,75,255,.92)" size={68} />
      <StarFlare right="10%" bottom="21%" color="#FFF2B8" glow="rgba(255,210,100,.86)" size={54} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 45%, transparent 24%, rgba(0,0,0,.36) 66%, rgba(0,0,0,.82) 100%)" }} />
    </>
  );
}

function StarFlare({ left, right, top, bottom, color, glow, size }: { left?: string; right?: string; top?: string; bottom?: string; color: string; glow: string; size: number }) {
  const hTransform = right != null ? `translate(${Math.round(size / 2)}px, 1px)` : `translate(-${Math.round(size / 2)}px, 1px)`;
  const vTransform = bottom != null ? `translate(1px, ${Math.round(size / 2)}px)` : `translate(1px, -${Math.round(size / 2)}px)`;
  return (
    <>
      <div style={{ position: "absolute", left, right, top, bottom, width: 2, height: 2, background: color, boxShadow: `0 0 17px 5px ${glow}`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left, right, top, bottom, width: size, height: 1, transform: hTransform, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left, right, top, bottom, width: 1, height: size, transform: vTransform, background: `linear-gradient(180deg, transparent, ${color}, transparent)`, pointerEvents: "none" }} />
    </>
  );
}
