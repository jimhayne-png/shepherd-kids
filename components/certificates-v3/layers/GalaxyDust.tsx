"use client";

const stars: [number, number, number, string, number][] = [
  [72, 70, 0.7, "#ffffff", 0.42],
  [106, 96, 0.6, "#D8AEFF", 0.42],
  [144, 62, 0.7, "#F6D36B", 0.50],
  [226, 82, 0.6, "#D8AEFF", 0.38],
  [274, 132, 0.7, "#F6D36B", 0.44],
  [792, 106, 0.45, "#ffffff", 0.32],
  [852, 118, 0.45, "#F6D36B", 0.38],
  [912, 128, 0.5, "#D8AEFF", 0.40],
  [972, 116, 0.5, "#F6D36B", 0.40],
  [116, 520, 0.5, "#ffffff", 0.22],
  [208, 582, 0.7, "#F6D36B", 0.28],
  [826, 552, 0.7, "#D8AEFF", 0.28],
  [944, 626, 0.6, "#F6D36B", 0.26],
  [996, 738, 0.5, "#ffffff", 0.20],
];

const dust: [number, number, number, string, number][] = [
  [80, 96, 0.8, "#ffffff", 0.38],
  [116, 124, 0.7, "#D8AEFF", 0.48],
  [152, 84, 0.9, "#F6D36B", 0.52],
  [194, 134, 0.6, "#ffffff", 0.36],
  [240, 108, 0.8, "#D8AEFF", 0.46],
  [286, 150, 0.7, "#ffffff", 0.32],
  [332, 116, 0.9, "#F6D36B", 0.46],
  [382, 148, 0.7, "#D8AEFF", 0.40],
  [430, 128, 0.6, "#ffffff", 0.30],
  [96, 184, 0.7, "#D8AEFF", 0.44],
  [148, 214, 0.6, "#ffffff", 0.32],
  [206, 188, 0.8, "#F6D36B", 0.44],
  [272, 222, 0.7, "#D8AEFF", 0.38],
  [344, 196, 0.6, "#ffffff", 0.28],
  [420, 226, 0.6, "#D8AEFF", 0.30],
  [676, 700, 0.7, "#ffffff", 0.30],
  [724, 734, 0.9, "#D8AEFF", 0.44],
  [778, 694, 0.9, "#F6D36B", 0.48],
  [838, 720, 0.7, "#ffffff", 0.32],
  [892, 688, 1.0, "#D8AEFF", 0.48],
  [950, 724, 0.7, "#ffffff", 0.30],
  [1008, 700, 0.9, "#F6D36B", 0.44],
  [1050, 752, 0.7, "#D8AEFF", 0.38],
  [710, 786, 0.7, "#F6D36B", 0.36],
  [784, 812, 0.6, "#ffffff", 0.28],
  [866, 792, 0.8, "#D8AEFF", 0.40],
  [940, 818, 0.6, "#ffffff", 0.28],
  [1024, 804, 0.8, "#F6D36B", 0.36],
];

const nebulaLayers = [
  {
    left: "-30%",
    top: "-15%",
    width: "88%",
    height: "58%",
    blur: 54,
    opacity: 0.38,
    rotate: -12,
    background:
      "radial-gradient(ellipse at center, rgba(200,170,255,.10) 0%, rgba(160,60,230,.12) 18%, rgba(110,38,175,.08) 38%, rgba(54,16,110,.05) 58%, transparent 78%)",
  },
  {
    left: "-18%",
    top: "2%",
    width: "60%",
    height: "34%",
    blur: 38,
    opacity: 0.30,
    rotate: -18,
    background:
      "radial-gradient(ellipse at center, rgba(240,205,100,.07) 0%, rgba(160,60,230,.08) 30%, rgba(110,38,175,.06) 55%, transparent 80%)",
  },
  {
    right: "-34%",
    bottom: "-20%",
    width: "94%",
    height: "62%",
    blur: 58,
    opacity: 0.42,
    rotate: -14,
    background:
      "radial-gradient(ellipse at center, rgba(200,170,255,.11) 0%, rgba(160,60,230,.14) 20%, rgba(110,38,175,.09) 42%, rgba(54,16,110,.05) 62%, transparent 82%)",
  },
  {
    right: "-12%",
    bottom: "-2%",
    width: "56%",
    height: "32%",
    blur: 36,
    opacity: 0.32,
    rotate: -16,
    background:
      "radial-gradient(ellipse at center, rgba(240,205,100,.07) 0%, rgba(200,158,240,.09) 28%, rgba(110,38,175,.06) 58%, transparent 84%)",
  },
  {
    left: "18%",
    top: "28%",
    width: "64%",
    height: "34%",
    blur: 70,
    opacity: 0.16,
    rotate: -8,
    background:
      "radial-gradient(ellipse at center, rgba(160,60,230,.10) 0%, rgba(110,38,175,.06) 44%, transparent 76%)",
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
          opacity: 0.18,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,.06), transparent 16%), radial-gradient(circle at 82% 82%, rgba(255,255,255,.06), transparent 18%)",
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

        <g opacity="0.80">
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

        <g filter="url(#softBloom)" opacity="0.22">
          <circle cx="142" cy="176" r="2.2" fill="#B84CFF" />
          <circle cx="306" cy="132" r="1.8" fill="#F6D36B" />
          <circle cx="824" cy="708" r="2.4" fill="#B84CFF" />
          <circle cx="986" cy="756" r="1.9" fill="#F6D36B" />
          <circle cx="212" cy="244" r="1.7" fill="#FFFFFF" />
          <circle cx="882" cy="646" r="1.8" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
