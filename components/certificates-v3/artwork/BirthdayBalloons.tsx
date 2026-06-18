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
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#${fillId})`}
        filter="url(#balloonShadow)"
      />

      <ellipse
        cx={cx - rx * 0.24}
        cy={cy - ry * 0.26}
        rx={rx * 0.16}
        ry={ry * 0.38}
        fill="rgba(255,255,255,.42)"
        filter="url(#softBlur)"
        transform={`rotate(-12 ${cx - rx * 0.24} ${cy - ry * 0.26})`}
      />

      <ellipse
        cx={cx + rx * 0.22}
        cy={cy - ry * 0.18}
        rx={rx * 0.1}
        ry={ry * 0.22}
        fill="rgba(255,255,255,.16)"
        filter="url(#softBlur)"
      />

      <path
        d={`M ${cx - 4} ${cy + ry - 1} L ${cx + 4} ${
          cy + ry - 1
        } L ${cx} ${cy + ry + 8} Z`}
        fill={`url(#${fillId})`}
        opacity=".95"
      />
    </g>
  );
}

function CurlRibbon({
  d,
  color = "#D4AF37",
  opacity = 0.58,
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
      strokeWidth="0.8"
      strokeLinecap="round"
      opacity={opacity}
      filter="url(#ribbonGlow)"
    />
  );
}

function SharedDefs() {
  return (
    <defs>
      <radialGradient id="purpleBalloon" cx="34%" cy="28%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".74" />
        <stop offset="12%" stopColor="#c28aff" />
        <stop offset="36%" stopColor="#7B2CBF" />
        <stop offset="72%" stopColor="#35105f" />
        <stop offset="100%" stopColor="#12051e" />
      </radialGradient>

      <radialGradient id="goldBalloon" cx="34%" cy="28%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".82" />
        <stop offset="14%" stopColor="#fff4bd" />
        <stop offset="38%" stopColor="#D4AF37" />
        <stop offset="74%" stopColor="#8c6616" />
        <stop offset="100%" stopColor="#3d2708" />
      </radialGradient>

      <radialGradient id="blueBalloon" cx="34%" cy="28%" r="74%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".72" />
        <stop offset="14%" stopColor="#9ed1ff" />
        <stop offset="38%" stopColor="#2468b8" />
        <stop offset="76%" stopColor="#0c2f66" />
        <stop offset="100%" stopColor="#04142d" />
      </radialGradient>

      <filter id="softBlur">
        <feGaussianBlur stdDeviation="4" />
      </filter>

      <filter id="balloonShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow
          dx="0"
          dy="10"
          stdDeviation="7"
          floodColor="#000000"
          floodOpacity=".45"
        />
      </filter>

      <filter id="ribbonGlow">
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="1"
          floodColor="#D4AF37"
          floodOpacity=".22"
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
      <Balloon cx={38} cy={206} rx={48} ry={72} fillId="blueBalloon" rotate={-11} opacity={0.9} />
      <Balloon cx={142} cy={198} rx={50} ry={74} fillId="goldBalloon" rotate={8} />
      <Balloon cx={86} cy={318} rx={54} ry={78} fillId="goldBalloon" rotate={-8} />
      <Balloon cx={48} cy={426} rx={40} ry={60} fillId="purpleBalloon" rotate={10} opacity={0.95} />

      <CurlRibbon d="M104 150 C98 190 124 212 106 250 C88 290 116 314 98 352 C82 390 102 418 84 462 C74 492 82 520 70 558" />
      <CurlRibbon d="M38 278 C54 322 30 354 50 396 C68 438 44 470 62 528" color="#b88aff" opacity={0.45} />
      <CurlRibbon d="M142 272 C158 310 138 348 160 386 C180 426 150 462 172 530" />
      <CurlRibbon d="M86 396 C100 430 76 462 96 496 C108 520 94 540 106 560" opacity={0.5} />

      <g opacity=".55">
        <rect x="124" y="36" width="7" height="7" rx="1" fill="#7B2CBF" transform="rotate(22 127.5 39.5)" />
        <rect x="186" y="100" width="7" height="7" rx="1" fill="#D4AF37" transform="rotate(44 189.5 103.5)" />
        <rect x="214" y="246" width="6" height="6" rx="1" fill="#D4AF37" transform="rotate(30 217 249)" />
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
      <Balloon cx={266} cy={206} rx={50} ry={74} fillId="blueBalloon" rotate={8} opacity={0.92} />
      <Balloon cx={210} cy={326} rx={52} ry={76} fillId="goldBalloon" rotate={-7} />
      <Balloon cx={286} cy={436} rx={38} ry={56} fillId="blueBalloon" rotate={10} opacity={0.9} />

      <CurlRibbon d="M228 154 C244 192 216 230 236 268 C258 312 230 348 252 390 C274 432 248 478 270 548" />
      <CurlRibbon d="M150 270 C166 314 138 350 160 390 C178 430 150 468 172 540" color="#b88aff" opacity={0.45} />
      <CurlRibbon d="M266 280 C246 322 276 362 254 402 C234 438 260 480 244 548" opacity={0.52} />
      <CurlRibbon d="M210 402 C226 438 198 478 218 510 C228 530 220 548 232 560" opacity={0.5} />

      <g opacity=".55">
        <rect x="210" y="32" width="8" height="8" rx="1" fill="#D4AF37" transform="rotate(42 214 36)" />
        <rect x="286" y="120" width="7" height="7" rx="1" fill="#7B2CBF" transform="rotate(34 289.5 123.5)" />
        <rect x="244" y="246" width="7" height="7" rx="1" fill="#D4AF37" transform="rotate(28 247.5 249.5)" />
        <rect x="176" y="388" width="6" height="6" rx="1" fill="#7B2CBF" transform="rotate(40 179 391)" />
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