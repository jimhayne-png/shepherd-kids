"use client";

const CORNER_POSITIONS: React.CSSProperties[] = [
  { top: "15px", left: "15px" },
  { top: "15px", right: "15px" },
  { bottom: "15px", left: "15px" },
  { bottom: "15px", right: "15px" },
];

export default function PremiumFrame() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* Outer ambient glow behind the frame */}
      <div
        style={{
          position: "absolute",
          inset: "14px",
          borderRadius: "2px",
          boxShadow:
            "0 0 48px rgba(212,175,55,.16), 0 0 96px rgba(212,175,55,.06)",
        }}
      />

      {/* Main outer border — metallic gold */}
      <div
        style={{
          position: "absolute",
          inset: "22px",
          border: "2px solid rgba(212,175,55,0.94)",
          borderRadius: "1px",
          boxShadow:
            "0 0 0 1px rgba(255,248,200,.30)," +
            "inset 0 0 0 1px rgba(255,248,200,.20)," +
            "0 0 22px rgba(212,175,55,.24)," +
            "inset 0 0 10px rgba(212,175,55,.10)",
        }}
      />

      {/* Corner diamond ornaments */}
      {CORNER_POSITIONS.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 14,
            height: 14,
            transform: "rotate(45deg)",
            background:
              "linear-gradient(135deg, #fff8d6 0%, #e8c740 40%, #a07818 70%, #d4af37 100%)",
            boxShadow:
              "0 0 6px rgba(212,175,55,.55), 0 0 14px rgba(212,175,55,.22)",
            zIndex: 1,
          }}
        />
      ))}

      {/* Middle fine border */}
      <div
        style={{
          position: "absolute",
          inset: "32px",
          border: "1px solid rgba(212,175,55,.58)",
        }}
      />

      {/* Inner accent border */}
      <div
        style={{
          position: "absolute",
          inset: "44px",
          border: "1px solid rgba(255,248,200,.24)",
        }}
      />

      {/* Top horizontal accent line */}
      <div
        style={{
          position: "absolute",
          left: "62px",
          right: "62px",
          top: "56px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,.38), rgba(255,248,200,.82), rgba(255,255,220,.95), rgba(255,248,200,.82), rgba(212,175,55,.38), transparent)",
        }}
      />

      {/* Bottom horizontal accent line */}
      <div
        style={{
          position: "absolute",
          left: "62px",
          right: "62px",
          bottom: "56px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,.38), rgba(255,248,200,.82), rgba(255,255,220,.95), rgba(255,248,200,.82), rgba(212,175,55,.38), transparent)",
        }}
      />

      {/* Center-top tick mark */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "28px",
          transform: "translateX(-50%)",
          width: "1px",
          height: "14px",
          background:
            "linear-gradient(180deg, transparent, rgba(212,175,55,.72), transparent)",
        }}
      />

      {/* Center-bottom tick mark */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "28px",
          transform: "translateX(-50%)",
          width: "1px",
          height: "14px",
          background:
            "linear-gradient(180deg, transparent, rgba(212,175,55,.72), transparent)",
        }}
      />

      {/* Center-left tick mark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "28px",
          transform: "translateY(-50%)",
          width: "14px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,.72), transparent)",
        }}
      />

      {/* Center-right tick mark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "28px",
          transform: "translateY(-50%)",
          width: "14px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,.72), transparent)",
        }}
      />

      {/* Metallic diagonal sheen */}
      <div
        style={{
          position: "absolute",
          inset: "22px",
          background:
            "linear-gradient(135deg, rgba(255,248,200,.20) 0%, transparent 22%, transparent 78%, rgba(212,175,55,.15) 100%)",
          mixBlendMode: "screen",
          opacity: 0.88,
        }}
      />
    </div>
  );
}
