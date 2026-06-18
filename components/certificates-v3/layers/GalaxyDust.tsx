"use client";

const stars: [number, number, number, string, number][] = [
  [72, 70, 0.7, "#ffffff", 0.5],
  [106, 96, 0.6, "#D8AEFF", 0.5],
  [144, 62, 0.7, "#F6D36B", 0.58],
  [226, 82, 0.6, "#D8AEFF", 0.46],
  [274, 132, 0.7, "#F6D36B", 0.52],
  [792, 106, 0.45, "#ffffff", 0.4],
  [852, 118, 0.45, "#F6D36B", 0.46],
  [912, 128, 0.5, "#D8AEFF", 0.48],
  [972, 116, 0.5, "#F6D36B", 0.48],
  [116, 520, 0.5, "#ffffff", 0.28],
  [208, 582, 0.7, "#F6D36B", 0.34],
  [826, 552, 0.7, "#D8AEFF", 0.34],
  [944, 626, 0.6, "#F6D36B", 0.32],
  [996, 738, 0.5, "#ffffff", 0.24],
];

const confetti = [
  { x: 138, y: 82, size: 9, color: "#7B2CBF", rotate: 20, opacity: 0.55 },
  { x: 218, y: 116, size: 8, color: "#D4AF37", rotate: 45, opacity: 0.62 },
  { x: 880, y: 94, size: 9, color: "#D4AF37", rotate: 42, opacity: 0.62 },
  { x: 1012, y: 152, size: 8, color: "#7B2CBF", rotate: 35, opacity: 0.52 },
  { x: 922, y: 204, size: 8, color: "#D4AF37", rotate: 24, opacity: 0.58 },
  { x: 214, y: 376, size: 8, color: "#D4AF37", rotate: 40, opacity: 0.52 },
  { x: 900, y: 612, size: 7, color: "#7B2CBF", rotate: 42, opacity: 0.44 },
  { x: 972, y: 680, size: 7, color: "#D4AF37", rotate: 36, opacity: 0.52 },
];

const dust: [number, number, number, string, number][] = [
  [80, 96, 0.8, "#ffffff", 0.42],
  [116, 124, 0.7, "#D8AEFF", 0.55],
  [152, 84, 0.9, "#F6D36B", 0.58],
  [194, 134, 0.6, "#ffffff", 0.42],
  [240, 108, 0.8, "#D8AEFF", 0.52],
  [286, 150, 0.7, "#ffffff", 0.38],
  [332, 116, 0.9, "#F6D36B", 0.52],
  [382, 148, 0.7, "#D8AEFF", 0.46],
  [430, 128, 0.6, "#ffffff", 0.36],
  [96, 184, 0.7, "#D8AEFF", 0.5],
  [148, 214, 0.6, "#ffffff", 0.38],
  [206, 188, 0.8, "#F6D36B", 0.5],
  [272, 222, 0.7, "#D8AEFF", 0.44],
  [344, 196, 0.6, "#ffffff", 0.34],
  [420, 226, 0.6, "#D8AEFF", 0.36],
  [676, 700, 0.7, "#ffffff", 0.36],
  [724, 734, 0.9, "#D8AEFF", 0.52],
  [778, 694, 0.9, "#F6D36B", 0.55],
  [838, 720, 0.7, "#ffffff", 0.38],
  [892, 688, 1.0, "#D8AEFF", 0.55],
  [950, 724, 0.7, "#ffffff", 0.36],
  [1008, 700, 0.9, "#F6D36B", 0.52],
  [1050, 752, 0.7, "#D8AEFF", 0.46],
  [710, 786, 0.7, "#F6D36B", 0.42],
  [784, 812, 0.6, "#ffffff", 0.34],
  [866, 792, 0.8, "#D8AEFF", 0.48],
  [940, 818, 0.6, "#ffffff", 0.34],
  [1024, 804, 0.8, "#F6D36B", 0.42],
];

const nebulaLayers = [
  {
    left: "-30%",
    top: "-15%",
    width: "88%",
    height: "58%",
    blur: 54,
    opacity: 0.82,
    rotate: -12,
    background:
      "radial-gradient(ellipse at center, rgba(255,235,255,.18) 0%, rgba(184,76,255,.22) 18%, rgba(123,44,191,.16) 38%, rgba(60,18,120,.10) 58%, transparent 78%)",
  },
  {
    left: "-18%",
    top: "2%",
    width: "60%",
    height: "34%",
    blur: 38,
    opacity: 0.72,
    rotate: -18,
    background:
      "radial-gradient(ellipse at center, rgba(246,211,107,.12) 0%, rgba(184,76,255,.15) 30%, rgba(123,44,191,.10) 55%, transparent 80%)",
  },
  {
    right: "-34%",
    bottom: "-20%",
    width: "94%",
    height: "62%",
    blur: 58,
    opacity: 0.95,
    rotate: -14,
    background:
      "radial-gradient(ellipse at center, rgba(255,235,255,.20) 0%, rgba(184,76,255,.26) 20%, rgba(123,44,191,.18) 42%, rgba(60,18,120,.10) 62%, transparent 82%)",
  },
  {
    right: "-12%",
    bottom: "-2%",
    width: "56%",
    height: "32%",
    blur: 36,
    opacity: 0.78,
    rotate: -16,
    background:
      "radial-gradient(ellipse at center, rgba(246,211,107,.13) 0%, rgba(216,174,255,.16) 28%, rgba(123,44,191,.10) 58%, transparent 84%)",
  },
  {
    left: "18%",
    top: "28%",
    width: "64%",
    height: "34%",
    blur: 70,
    opacity: 0.28,
    rotate: -8,
    background:
      "radial-gradient(ellipse at center, rgba(184,76,255,.16) 0%, rgba(123,44,191,.09) 44%, transparent 76%)",
  },
];

export default function GalaxyDust() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {nebulaLayers.map((layer, index) => (
        <div
          key={`nebula-${index}`}
          style={{
            position: "absolute",
            left: layer.left,
            right: layer.right,
            top: layer.top,
            bottom: layer.bottom,
            width: layer.width,
            height: layer.height,
            borderRadius: "50%",
            transform: `rotate(${layer.rotate}deg)`,
            filter: `blur(${layer.blur}px)`,
            opacity: layer.opacity,
            mixBlendMode: "screen",
            background: layer.background,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.28,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,.08), transparent 16%), radial-gradient(circle at 82% 82%, rgba(255,255,255,.08), transparent 18%), radial-gradient(circle at 50% 52%, rgba(184,76,255,.08), transparent 42%)",
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1100 850"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softBloom" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity="0.9">
          {stars.map(([cx, cy, r, fill, opacity], index) => (
            <circle
              key={`star-${index}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              opacity={opacity}
            />
          ))}
        </g>

        <g filter="url(#particleGlow)">
          {dust.map(([cx, cy, r, fill, opacity], index) => (
            <circle
              key={`dust-${index}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              opacity={opacity}
            />
          ))}
        </g>

        <g filter="url(#softBloom)" opacity="0.32">
          <circle cx="142" cy="176" r="2.2" fill="#B84CFF" />
          <circle cx="306" cy="132" r="1.8" fill="#F6D36B" />
          <circle cx="824" cy="708" r="2.4" fill="#B84CFF" />
          <circle cx="986" cy="756" r="1.9" fill="#F6D36B" />
          <circle cx="212" cy="244" r="1.7" fill="#FFFFFF" />
          <circle cx="882" cy="646" r="1.8" fill="#FFFFFF" />
        </g>

        <g>
          {confetti.map((piece, index) => (
            <rect
              key={`confetti-${index}`}
              x={piece.x}
              y={piece.y}
              width={piece.size}
              height={piece.size}
              rx="1"
              fill={piece.color}
              opacity={piece.opacity}
              transform={`rotate(${piece.rotate} ${piece.x + piece.size / 2} ${
                piece.y + piece.size / 2
              })`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}