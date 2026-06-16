"use client";

import type { CertificateTemplate } from "@/lib/certificates/themes";

type Side = "left" | "right";

export default function BirthdayArtwork({ template, side }: { template: CertificateTemplate; side: Side }) {
  const ivory = template === "white";
  const mirror = side === "right";
  const purpleA = ivory ? "#5B1E8C" : "#5D18A5";
  const purpleB = ivory ? "#7B2CBF" : "#BD78FF";
  const goldA = ivory ? "#B8860B" : "#D4AF37";
  const goldB = ivory ? "#E2BC58" : "#FFF4B8";
  const stringColor = ivory ? "rgba(139,105,20,.45)" : "rgba(248,230,160,.70)";

  return (
    <svg width="288" height="520" viewBox="0 0 270 520" style={{ overflow: "visible", transform: mirror ? "scaleX(-1)" : undefined }} aria-hidden="true">
      <defs>
        <radialGradient id={`sk-purple-a-${side}`} cx="35%" cy="22%" r="82%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".92" />
          <stop offset="12%" stopColor="#E6B8FF" stopOpacity=".70" />
          <stop offset="34%" stopColor={purpleB} stopOpacity=".98" />
          <stop offset="72%" stopColor={purpleA} stopOpacity=".97" />
          <stop offset="100%" stopColor="#100018" stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`sk-purple-b-${side}`} cx="36%" cy="22%" r="82%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".78" />
          <stop offset="18%" stopColor="#C98DFF" stopOpacity=".62" />
          <stop offset="42%" stopColor="#8E36E8" stopOpacity=".96" />
          <stop offset="76%" stopColor="#4C0F7F" stopOpacity=".98" />
          <stop offset="100%" stopColor="#120018" stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`sk-gold-${side}`} cx="35%" cy="22%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".94" />
          <stop offset="14%" stopColor="#FFF8D2" stopOpacity=".80" />
          <stop offset="34%" stopColor={goldB} stopOpacity="1" />
          <stop offset="72%" stopColor={goldA} stopOpacity=".98" />
          <stop offset="100%" stopColor="#5C3300" stopOpacity=".98" />
        </radialGradient>
        <filter id={`sk-balloon-shadow-${side}`} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#000000" floodOpacity={ivory ? ".18" : ".54"} />
        </filter>
      </defs>

      <g filter={`url(#sk-balloon-shadow-${side})`} opacity={ivory ? ".78" : ".95"}>
        <ellipse cx="24" cy="108" rx="62" ry="86" fill={`url(#sk-purple-a-${side})`} />
        <ellipse cx="8" cy="78" rx="22" ry="13" fill="rgba(255,255,255,.50)" transform="rotate(-18 8 78)" />
        <path d="M24 196l-11 14h22z" fill={purpleA} opacity=".72" />
        <ellipse cx="106" cy="207" rx="62" ry="84" fill={`url(#sk-gold-${side})`} />
        <ellipse cx="88" cy="178" rx="24" ry="14" fill="rgba(255,255,255,.58)" transform="rotate(-18 88 178)" />
        <path d="M106 292l-11 14h22z" fill={goldA} opacity=".78" />
        <ellipse cx="28" cy="302" rx="68" ry="92" fill={`url(#sk-purple-b-${side})`} />
        <ellipse cx="10" cy="268" rx="23" ry="14" fill="rgba(255,255,255,.46)" transform="rotate(-18 10 268)" />
        <path d="M28 396l-11 14h22z" fill="#5E169B" opacity=".74" />
      </g>

      <g fill="none" stroke={stringColor} strokeWidth="1.8" strokeLinecap="round" opacity=".82">
        <path d="M24 210C2 270 38 322 14 434" />
        <path d="M106 306C82 362 124 404 100 512" />
        <path d="M28 410C6 440 46 464 24 520" />
      </g>
    </svg>
  );
}
