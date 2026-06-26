"use client";

function Balloon({
  cx,
  cy,
  rx,
  ry,
  fillId,
  rotate = 0,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fillId: string;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`} opacity={opacity}>
      {/* Balloon body */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#${fillId})`}
        filter="url(#balloonShadow)"
      />

      {/* Primary specular highlight */}
      <ellipse
        cx={cx - rx * 0.26}
        cy={cy - ry * 0.28}
        rx={rx * 0.18}
        ry={ry * 0.40}
        fill="rgba(255,255,255,.54)"
        filter="url(#softBlur)"
        transform={`rotate(-12 ${cx - rx * 0.26} ${cy - ry * 0.28})`}
      />

      {/* Secondary soft highlight */}
      <ellipse
        cx={cx + rx * 0.20}
        cy={cy - ry * 0.16}
        rx={rx * 0.10}
        ry={ry * 0.22}
        fill="rgba(255,255,255,.22)"
        filter="url(#softBlur)"
      />

      {/* Tiny bright specular dot */}
      <ellipse
        cx={cx - rx * 0.28}
        cy={cy - ry * 0.36}
        rx={rx * 0.06}
        ry={ry * 0.10}
        fill="rgba(255,255,255,.80)"
      />

      {/* Knot */}
      <path
        d={`M ${cx - 4} ${cy + ry - 1} L ${cx + 4} ${cy + ry - 1} L ${cx} ${cy + ry + 9} Z`}
        fill={`url(#${fillId})`}
        opacity=".90"
      />
    </g>
  );
}

function CurlRibbon({
  d,
  color = "#D4AF37",
  opacity = 0.65,
}: {
  d: string;
  color?: string;
  opacity?: number;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="1.0"
      strokeLinecap="round"
      opacity={opacity}
      filter="url(#ribbonGlow)"
    />
  );
}

function SharedDefs() {
  return (
    <defs>
      <radialGradient id="purpleBalloon" cx="32%" cy="26%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".80" />
        <stop offset="10%" stopColor="#d4a8ff" />
        <stop offset="32%" stopColor="#8B38D4" />
        <stop offset="68%" stopColor="#3a1168" />
        <stop offset="100%" stopColor="#130422" />
      </radialGradient>

      <radialGradient id="goldBalloon" cx="32%" cy="26%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".86" />
        <stop offset="12%" stopColor="#fff8cc" />
        <stop offset="34%" stopColor="#E0B830" />
        <stop offset="70%" stopColor="#946a18" />
        <stop offset="100%" stopColor="#42280a" />
      </radialGradient>

      <radialGradient id="blueBalloon" cx="32%" cy="26%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".78" />
        <stop offset="12%" stopColor="#b4daff" />
        <stop offset="34%" stopColor="#2872cc" />
        <stop offset="72%" stopColor="#0d3272" />
        <stop offset="100%" stopColor="#041632" />
      </radialGradient>

      <filter id="softBlur">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>

      <filter id="balloonShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow
          dx="2"
          dy="12"
          stdDeviation="8"
          floodColor="#000000"
          floodOpacity=".50"
        />
      </filter>

      <filter id="ribbonGlow">
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="1.2"
          floodColor="#D4AF37"
          floodOpacity=".28"
        />
      </filter>
    </defs>
  );
}

function LeftBalloonCluster() {
  return (
    <svg
      width="310"
      height="560"
      viewBox="0 0 310 560"
      style={{
        position: "absolute",
        left: "-58px",
        top: "118px",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <SharedDefs />

      <Balloon cx={104} cy={82} rx={46} ry={68} fillId="purpleBalloon" rotate={-7} />
      <Balloon cx={38} cy={206} rx={48} ry={72} fillId="blueBalloon" rotate={-11} opacity={0.92} />
      <Balloon cx={142} cy={198} rx={50} ry={74} fillId="goldBalloon" rotate={8} />
      <Balloon cx={86} cy={318} rx={54} ry={78} fillId="goldBalloon" rotate={-8} />
      <Balloon cx={48} cy={426} rx={40} ry={60} fillId="purpleBalloon" rotate={10} opacity={0.96} />

      <CurlRibbon d="M104 150 C96 192 124 216 104 256 C86 296 116 318 96 358 C80 396 102 424 84 468 C74 498 80 526 68 560" />
      <CurlRibbon d="M38 278 C56 324 30 358 52 400 C70 442 44 474 64 532" color="#b88aff" opacity={0.48} />
      <CurlRibbon d="M142 272 C160 312 138 352 162 390 C182 430 150 466 174 534" />
      <CurlRibbon d="M86 396 C102 432 76 466 98 500 C110 524 96 542 108 560" opacity={0.52} />

      <g opacity=".50">
        <rect x="126" y="34" width="7" height="7" rx="1" fill="#7B2CBF" transform="rotate(22 129.5 37.5)" />
        <rect x="188" y="102" width="7" height="7" rx="1" fill="#D4AF37" transform="rotate(44 191.5 105.5)" />
        <rect x="216" y="248" width="6" height="6" rx="1" fill="#D4AF37" transform="rotate(30 219 251)" />
      </g>
    </svg>
  );
}

function RightBalloonCluster() {
  return (
    <svg
      width="330"
      height="560"
      viewBox="0 0 330 560"
      style={{
        position: "absolute",
        right: "-72px",
        top: "128px",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <SharedDefs />

      <Balloon cx={228} cy={84} rx={48} ry={70} fillId="goldBalloon" rotate={7} />
      <Balloon cx={150} cy={202} rx={46} ry={68} fillId="purpleBalloon" rotate={-9} />
      <Balloon cx={266} cy={206} rx={50} ry={74} fillId="blueBalloon" rotate={8} opacity={0.94} />
      <Balloon cx={210} cy={326} rx={52} ry={76} fillId="goldBalloon" rotate={-7} />
      <Balloon cx={286} cy={436} rx={38} ry={56} fillId="blueBalloon" rotate={10} opacity={0.92} />

      <CurlRibbon d="M228 154 C246 194 216 234 238 274 C260 318 230 354 254 396 C276 438 248 484 272 552" />
      <CurlRibbon d="M150 270 C168 316 138 354 162 394 C180 434 150 472 174 544" color="#b88aff" opacity={0.48} />
      <CurlRibbon d="M266 280 C244 324 278 366 254 406 C232 442 260 484 242 552" opacity={0.54} />
      <CurlRibbon d="M210 402 C228 440 198 482 220 514 C230 534 222 550 234 562" opacity={0.52} />

      <g opacity=".50">
        <rect x="210" y="30" width="8" height="8" rx="1" fill="#D4AF37" transform="rotate(42 214 34)" />
        <rect x="288" y="120" width="7" height="7" rx="1" fill="#7B2CBF" transform="rotate(34 291.5 123.5)" />
        <rect x="244" y="246" width="7" height="7" rx="1" fill="#D4AF37" transform="rotate(28 247.5 249.5)" />
        <rect x="174" y="386" width="6" height="6" rx="1" fill="#7B2CBF" transform="rotate(40 177 389)" />
      </g>
    </svg>
  );
}

export default function BirthdayBalloons() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 12,
      }}
    >
      <LeftBalloonCluster />
      <RightBalloonCluster />
    </div>
  );
}
