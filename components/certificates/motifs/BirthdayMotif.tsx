"use client";

import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";
import type { CertTheme } from "@/lib/certificates/themes";

type MotifSide = "center" | "left" | "right";

interface BirthdayMotifProps {
  size?: number;
  side?: MotifSide;
}

const CENTER_VB = { w: 76, h: 68 };
const SIDE_VB = { w: 110, h: 150 };

function dims(vb: { w: number; h: number }, size: number) {
  return { width: size, height: Math.round((size * vb.h) / vb.w) };
}

function SideDefs({ t, p }: { t: CertTheme; p: string }) {
  return (
    <defs>
      <radialGradient id={`${p}gG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFF5C0" stopOpacity={0.97} />
        <stop offset="42%" stopColor={t.motifBalloon2} stopOpacity={1} />
        <stop offset="100%" stopColor="#6B4E00" stopOpacity={0.88} />
      </radialGradient>

      <radialGradient id={`${p}agG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFD060" stopOpacity={0.97} />
        <stop offset="42%" stopColor="#B8860B" stopOpacity={1} />
        <stop offset="100%" stopColor="#4A3200" stopOpacity={0.9} />
      </radialGradient>

      <radialGradient id={`${p}pG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#DDB8FF" stopOpacity={0.97} />
        <stop offset="42%" stopColor={t.motifBalloon1} stopOpacity={1} />
        <stop offset="100%" stopColor="#280050" stopOpacity={0.88} />
      </radialGradient>

      <radialGradient id={`${p}dpG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#C288EE" stopOpacity={0.97} />
        <stop offset="42%" stopColor={t.motifBalloon3} stopOpacity={1} />
        <stop offset="100%" stopColor="#180045" stopOpacity={0.88} />
      </radialGradient>

      <radialGradient id={`${p}cgG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFF5C0" stopOpacity={0.52} />
        <stop offset="50%" stopColor={t.motifBalloon2} stopOpacity={0.32} />
        <stop offset="100%" stopColor="#6B4E00" stopOpacity={0.15} />
      </radialGradient>

      <radialGradient id={`${p}cpG`} cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#DDB8FF" stopOpacity={0.46} />
        <stop offset="50%" stopColor={t.motifBalloon1} stopOpacity={0.27} />
        <stop offset="100%" stopColor="#280050" stopOpacity={0.12} />
      </radialGradient>
    </defs>
  );
}

function Balloon({
  cx,
  cy,
  rx,
  ry,
  gradId,
  rot = 0,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  gradId: string;
  rot?: number;
}) {
  const transform = rot ? `rotate(${rot},${cx},${cy})` : undefined;
  const shineCx = cx - rx * 0.34;
  const shineCy = cy - ry * 0.31;

  return (
    <g transform={transform}>
      <ellipse
        cx={cx + 2.2}
        cy={cy + 3.2}
        rx={rx * 0.88}
        ry={ry * 0.84}
        fill="rgba(0,0,0,0.24)"
      />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={gradId} />
      <ellipse
        cx={shineCx}
        cy={shineCy}
        rx={rx * 0.28}
        ry={ry * 0.18}
        fill="rgba(255,255,255,0.38)"
        transform={`rotate(-24,${shineCx},${shineCy})`}
      />
    </g>
  );
}

function StringKnot({ cx, knotY, color }: { cx: number; knotY: number; color: string }) {
  return (
    <>
      <circle cx={cx} cy={knotY + 2.5} r={2.2} fill={color} opacity="0.68" />
      <path
        d={`M ${cx} ${knotY + 5} Q ${cx - 1.5} ${knotY + 12} ${cx} ${knotY + 20}`}
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
    </>
  );
}

function RibbonTail({
  x,
  y,
  color,
  dir = 1,
}: {
  x: number;
  y: number;
  color: string;
  dir?: 1 | -1;
}) {
  const d = [
    `M ${x} ${y}`,
    `C ${x + dir * 20} ${y + 24} ${x - dir * 16} ${y + 50} ${x + dir * 12} ${y + 76}`,
    `C ${x + dir * 32} ${y + 100} ${x - dir * 8} ${y + 128} ${x + dir * 6} ${y + 154}`,
  ].join(" ");

  return (
    <path
      d={d}
      stroke={color}
      strokeWidth="1.65"
      fill="none"
      opacity="0.64"
      strokeLinecap="round"
    />
  );
}

function Confetti({ gold, purple }: { gold: string; purple: string }) {
  return (
    <g>
      <rect x="86" y="4" width="5.5" height="3.2" fill={gold} opacity="0.76" transform="rotate(32,88,5)" />
      <rect x="72" y="8" width="4.5" height="3.2" fill={gold} opacity="0.66" transform="rotate(16,74,9)" />
      <rect x="92" y="28" width="5" height="3" fill={purple} opacity="0.6" transform="rotate(-20,94,29)" />
      <rect x="98" y="48" width="4.5" height="2.8" fill={gold} opacity="0.58" transform="rotate(15,100,49)" />
      <rect x="100" y="70" width="4" height="2.8" fill={gold} opacity="0.5" transform="rotate(-25,102,71)" />

      <rect x="16" y="54" width="4" height="2.8" fill={purple} opacity="0.5" transform="rotate(-14,18,55)" />
      <rect x="28" y="82" width="4" height="3" fill={gold} opacity="0.48" transform="rotate(28,30,83)" />
      <rect x="52" y="100" width="4.5" height="2.5" fill={purple} opacity="0.42" transform="rotate(-18,54,101)" />
      <rect x="76" y="106" width="4" height="2.8" fill={gold} opacity="0.4" transform="rotate(22,78,107)" />

      <circle cx="82" cy="12" r="2.4" fill={gold} opacity="0.68" />
      <circle cx="100" cy="22" r="2" fill={purple} opacity="0.6" />
      <circle cx="102" cy="62" r="2" fill={gold} opacity="0.54" />
      <circle cx="24" cy="68" r="1.8" fill={purple} opacity="0.48" />
      <circle cx="88" cy="92" r="2" fill={gold} opacity="0.44" />

      <circle cx="38" cy="112" r="1.2" fill={gold} opacity="0.52" />
      <circle cx="62" cy="120" r="1" fill={gold} opacity="0.48" />
      <circle cx="84" cy="128" r="1.1" fill={gold} opacity="0.46" />
      <circle cx="28" cy="132" r="0.9" fill={gold} opacity="0.42" />
      <circle cx="96" cy="140" r="1" fill={gold} opacity="0.36" />
      <circle cx="54" cy="144" r="0.9" fill={purple} opacity="0.34" />
    </g>
  );
}

function Sparkle({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const r2 = r * 0.42;
  const d = `M${cx} ${cy - r} L${cx + r2} ${cy - r2} L${cx + r} ${cy} L${cx + r2} ${cy + r2} L${cx} ${cy + r} L${cx - r2} ${cy + r2} L${cx - r} ${cy} L${cx - r2} ${cy - r2}Z`;
  return <path d={d} fill={color} opacity="0.84" />;
}

function Sparkles({ gold }: { gold: string }) {
  return (
    <g>
      <Sparkle cx={92} cy={10} r={4.6} color={gold} />
      <Sparkle cx={104} cy={34} r={3.2} color={gold} />
      <Sparkle cx={74} cy={12} r={2.4} color={gold} />
      <Sparkle cx={102} cy={82} r={2.6} color={gold} />
      <Sparkle cx={20} cy={72} r={2.4} color={gold} />
      <Sparkle cx={48} cy={104} r={2} color={gold} />
      <Sparkle cx={90} cy={114} r={2.2} color={gold} />
      <Sparkle cx={34} cy={126} r={2.2} color={gold} />
      <Sparkle cx={68} cy={136} r={1.8} color={gold} />
      <Sparkle cx={94} cy={144} r={2} color={gold} />
    </g>
  );
}

type GradKey = "gG" | "agG" | "pG" | "dpG" | "cgG" | "cpG";

type BalloonSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  g: GradKey;
  rot: number;
  ribbon: boolean;
  dir: 1 | -1;
};

const SIDE_BALLOONS: BalloonSpec[] = [
  { cx: 18, cy: 18, rx: 12, ry: 15, g: "cpG", rot: -10, ribbon: false, dir: -1 },
  { cx: 58, cy: 52, rx: 14, ry: 17, g: "cgG", rot: 5, ribbon: false, dir: 1 },

  { cx: 90, cy: 18, rx: 14, ry: 17, g: "gG", rot: 16, ribbon: false, dir: 1 },
  { cx: 16, cy: 78, rx: 15, ry: 18, g: "dpG", rot: -8, ribbon: false, dir: -1 },
  { cx: 60, cy: 92, rx: 15, ry: 18, g: "agG", rot: -5, ribbon: false, dir: -1 },

  { cx: 72, cy: 30, rx: 23, ry: 29, g: "dpG", rot: 12, ribbon: false, dir: -1 },
  { cx: 38, cy: 82, rx: 22, ry: 27, g: "agG", rot: 4, ribbon: true, dir: -1 },
  { cx: 72, cy: 72, rx: 21, ry: 26, g: "pG", rot: -5, ribbon: true, dir: 1 },

  { cx: 42, cy: 34, rx: 34, ry: 41, g: "pG", rot: 8, ribbon: true, dir: 1 },
  { cx: 6, cy: 34, rx: 36, ry: 44, g: "gG", rot: -4, ribbon: true, dir: -1 },
];

function SideClusterContent({ t, flip, p }: { t: CertTheme; flip: boolean; p: string }) {
  const W = SIDE_VB.w;

  return (
    <g transform={flip ? `scale(-1,1) translate(-${W},0)` : undefined}>
      {SIDE_BALLOONS.map(({ cx, cy, rx, ry, g, rot }, i) => (
        <Balloon key={i} cx={cx} cy={cy} rx={rx} ry={ry} gradId={`url(#${p}${g})`} rot={rot} />
      ))}

      {SIDE_BALLOONS.map(({ cx, cy, ry, ribbon, dir }, i) =>
        ribbon ? (
          <RibbonTail key={i} x={cx} y={cy + ry + 5} color={t.motifStringColor} dir={dir} />
        ) : null
      )}

      {SIDE_BALLOONS.map(({ cx, cy, ry, ribbon }, i) =>
        !ribbon ? <StringKnot key={i} cx={cx} knotY={cy + ry} color={t.motifStringColor} /> : null
      )}

      <Confetti gold={t.motifBalloon2} purple={t.motifBalloon1} />
      <Sparkles gold={t.motifBalloon2} />
    </g>
  );
}

function CenterBalloons({ t }: { t: CertTheme }) {
  return (
    <>
      <defs>
        <radialGradient id="c-gG" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFF5C0" stopOpacity={0.97} />
          <stop offset="45%" stopColor={t.motifBalloon2} stopOpacity={1} />
          <stop offset="100%" stopColor="#6B4E00" stopOpacity={0.88} />
        </radialGradient>

        <radialGradient id="c-pG" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#DDB8FF" stopOpacity={0.97} />
          <stop offset="45%" stopColor={t.motifBalloon1} stopOpacity={1} />
          <stop offset="100%" stopColor="#280050" stopOpacity={0.88} />
        </radialGradient>

        <radialGradient id="c-dpG" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#C288EE" stopOpacity={0.97} />
          <stop offset="45%" stopColor={t.motifBalloon3} stopOpacity={1} />
          <stop offset="100%" stopColor="#180045" stopOpacity={0.88} />
        </radialGradient>
      </defs>

      <ellipse cx="18" cy="24" rx="13" ry="16" fill="url(#c-pG)" opacity={0.88} />
      <ellipse cx="14" cy="18" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 14, 18)" />
      <circle cx="18" cy="40" r="2" fill={t.motifBalloon1} opacity={0.7} />
      <path d="M18 42 Q14 52 18 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />

      <ellipse cx="38" cy="19" rx="14" ry="17" fill="url(#c-gG)" opacity={0.92} />
      <ellipse cx="33" cy="13" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 33, 13)" />
      <circle cx="38" cy="36" r="2.2" fill={t.motifBalloon2} opacity={0.7} />
      <path d="M38 38 Q34 50 38 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />

      <ellipse cx="58" cy="24" rx="13" ry="16" fill="url(#c-dpG)" opacity={0.82} />
      <ellipse cx="54" cy="18" rx="4" ry="3" fill={t.motifShineColor} transform="rotate(-20, 54, 18)" />
      <circle cx="58" cy="40" r="2" fill={t.motifBalloon3} opacity={0.7} />
      <path d="M58 42 Q54 52 58 62" stroke={t.motifStringColor} strokeWidth="1.2" fill="none" />
    </>
  );
}

export default function BirthdayMotif({ size = 95, side = "center" }: BirthdayMotifProps) {
  const theme = useCertificateTheme();

  if (side === "center") {
    const { width, height } = dims(CENTER_VB, size);

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${CENTER_VB.w} ${CENTER_VB.h}`}
        style={{ overflow: "visible", display: "block" }}
      >
        <CenterBalloons t={theme} />
      </svg>
    );
  }

  const p = side === "right" ? "r-" : "l-";
  const { width, height } = dims(SIDE_VB, size);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${SIDE_VB.w} ${SIDE_VB.h}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <SideDefs t={theme} p={p} />
      <SideClusterContent t={theme} flip={side === "right"} p={p} />
    </svg>
  );
}