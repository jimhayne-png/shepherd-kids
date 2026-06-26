"use client";

export default function CosmosBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: `
          radial-gradient(
            ellipse at 50% 46%,
            rgba(52,22,90,.30) 0%,
            rgba(30,12,56,.22) 20%,
            rgba(14,7,28,.13) 42%,
            rgba(5,3,12,.06) 64%,
            transparent 80%
          ),
          radial-gradient(
            ellipse at 14% 36%,
            rgba(88,30,148,.14) 0%,
            rgba(60,18,108,.08) 32%,
            transparent 62%
          ),
          radial-gradient(
            ellipse at 87% 40%,
            rgba(126,48,202,.20) 0%,
            rgba(84,28,154,.11) 30%,
            transparent 58%
          ),
          radial-gradient(
            ellipse at 12% 86%,
            rgba(108,36,168,.16) 0%,
            rgba(66,22,116,.09) 32%,
            transparent 66%
          ),
          radial-gradient(
            ellipse at 86% 88%,
            rgba(122,44,190,.18) 0%,
            rgba(78,28,138,.10) 34%,
            transparent 68%
          ),
          radial-gradient(
            ellipse at 50% 0%,
            rgba(94,32,158,.16) 0%,
            rgba(58,18,108,.08) 18%,
            transparent 42%
          ),
          radial-gradient(
            ellipse at 0% 50%,
            rgba(76,24,124,.12) 0%,
            transparent 48%
          ),
          radial-gradient(
            ellipse at 100% 50%,
            rgba(76,24,124,.12) 0%,
            transparent 48%
          ),
          linear-gradient(
            180deg,
            #02010a 0%,
            #06040c 28%,
            #04030a 62%,
            #010005 100%
          )
        `,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1100 850"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Top-left star cluster */}
        <g opacity="0.80">
          <circle cx="84" cy="76" r="1.05" fill="#ffffff" opacity="0.78" />
          <circle cx="120" cy="100" r="0.72" fill="#D8AEFF" opacity="0.68" />
          <circle cx="160" cy="70" r="0.92" fill="#F5D76D" opacity="0.74" />
          <circle cx="206" cy="116" r="0.62" fill="#ffffff" opacity="0.60" />
          <circle cx="242" cy="82" r="0.78" fill="#D8AEFF" opacity="0.65" />
          <circle cx="280" cy="134" r="0.82" fill="#F5D76D" opacity="0.68" />
          <circle cx="312" cy="92" r="0.62" fill="#ffffff" opacity="0.58" />
          <circle cx="352" cy="112" r="0.52" fill="#D8AEFF" opacity="0.50" />
          <circle cx="108" cy="160" r="0.68" fill="#ffffff" opacity="0.54" />
          <circle cx="146" cy="188" r="0.88" fill="#D8AEFF" opacity="0.65" />
          <circle cx="186" cy="152" r="0.68" fill="#ffffff" opacity="0.52" />
          <circle cx="232" cy="196" r="0.78" fill="#F5D76D" opacity="0.62" />
          <circle cx="296" cy="176" r="0.62" fill="#ffffff" opacity="0.52" />
          <circle cx="342" cy="160" r="0.52" fill="#D8AEFF" opacity="0.44" />
        </g>

        {/* Top-right accent stars */}
        <g opacity="0.68">
          <circle cx="984" cy="66" r="0.82" fill="#ffffff" opacity="0.62" />
          <circle cx="1022" cy="82" r="0.72" fill="#F5D76D" opacity="0.60" />
          <circle cx="1056" cy="100" r="0.62" fill="#D8AEFF" opacity="0.54" />
          <circle cx="1002" cy="116" r="0.68" fill="#ffffff" opacity="0.50" />
          <circle cx="962" cy="96" r="0.52" fill="#F5D76D" opacity="0.46" />
        </g>

        {/* Lower-right accent stars */}
        <g opacity="0.55">
          <circle cx="998" cy="768" r="0.72" fill="#ffffff" opacity="0.48" />
          <circle cx="1042" cy="788" r="0.58" fill="#D8AEFF" opacity="0.44" />
          <circle cx="1062" cy="754" r="0.52" fill="#F5D76D" opacity="0.40" />
        </g>

        {/* Crosshair accent stars */}
        <g strokeLinecap="round" opacity="0.58">
          <g stroke="#D8AEFF" strokeWidth="0.78">
            <line x1="146" y1="100" x2="146" y2="84" />
            <line x1="138" y1="92" x2="154" y2="92" />
          </g>
          <g stroke="#F5D76D" strokeWidth="0.72">
            <line x1="246" y1="142" x2="246" y2="128" />
            <line x1="239" y1="135" x2="253" y2="135" />
          </g>
          <g stroke="#ffffff" strokeWidth="0.68" opacity="0.50">
            <line x1="1022" y1="78" x2="1022" y2="66" />
            <line x1="1016" y1="72" x2="1028" y2="72" />
          </g>
        </g>
      </svg>
    </div>
  );
}
