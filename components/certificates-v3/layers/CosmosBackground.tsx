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
            ellipse at 50% 48%,
            rgba(42,18,74,.2) 0%,
            rgba(25,10,48,.16) 24%,
            rgba(12,6,25,.09) 46%,
            rgba(4,3,10,.04) 68%,
            transparent 84%
          ),

          radial-gradient(
            ellipse at 17% 42%,
            rgba(72,22,125,.09) 0%,
            rgba(52,16,96,.055) 36%,
            transparent 66%
          ),

          radial-gradient(
            ellipse at 88% 42%,
            rgba(112,42,185,.13) 0%,
            rgba(74,24,135,.075) 34%,
            transparent 62%
          ),

          radial-gradient(
            ellipse at 18% 82%,
            rgba(96,32,155,.1) 0%,
            rgba(56,18,105,.06) 36%,
            transparent 70%
          ),

          radial-gradient(
            ellipse at 82% 84%,
            rgba(108,38,175,.13) 0%,
            rgba(68,22,125,.075) 38%,
            transparent 72%
          ),

          radial-gradient(
            circle at 50% 0%,
            rgba(123,44,191,.11) 0%,
            rgba(78,24,140,.055) 22%,
            transparent 46%
          ),

          linear-gradient(
            180deg,
            #05030a 0%,
            #08060d 34%,
            #05040a 68%,
            #020205 100%
          )
        `,
      }}
    >
      {/* Top-left star cluster replacing cloudy washed-out area */}

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1100 850"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <g opacity="0.72">
          <circle cx="92" cy="82" r="0.9" fill="#ffffff" opacity="0.72" />
          <circle cx="128" cy="104" r="0.7" fill="#D8AEFF" opacity="0.62" />
          <circle cx="166" cy="76" r="0.8" fill="#F5D76D" opacity="0.68" />
          <circle cx="214" cy="118" r="0.6" fill="#ffffff" opacity="0.55" />
          <circle cx="248" cy="86" r="0.7" fill="#D8AEFF" opacity="0.58" />
          <circle cx="286" cy="138" r="0.8" fill="#F5D76D" opacity="0.6" />
          <circle cx="318" cy="96" r="0.6" fill="#ffffff" opacity="0.52" />

          <circle cx="118" cy="168" r="0.6" fill="#ffffff" opacity="0.5" />
          <circle cx="154" cy="194" r="0.8" fill="#D8AEFF" opacity="0.58" />
          <circle cx="196" cy="158" r="0.6" fill="#ffffff" opacity="0.48" />
          <circle cx="238" cy="204" r="0.7" fill="#F5D76D" opacity="0.56" />
          <circle cx="306" cy="184" r="0.6" fill="#ffffff" opacity="0.48" />
        </g>

        <g strokeLinecap="round" opacity="0.5">
          <g stroke="#D8AEFF" strokeWidth="0.7">
            <line x1="154" y1="102" x2="154" y2="86" />
            <line x1="146" y1="94" x2="162" y2="94" />
          </g>

          <g stroke="#F5D76D" strokeWidth="0.65">
            <line x1="252" y1="146" x2="252" y2="132" />
            <line x1="245" y1="139" x2="259" y2="139" />
          </g>
        </g>
      </svg>
    </div>
  );
}