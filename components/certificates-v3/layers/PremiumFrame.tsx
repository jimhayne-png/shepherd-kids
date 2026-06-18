"use client";

export default function PremiumFrame() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: "22px",
          border: "2px solid rgba(212,175,55,0.92)",
          boxShadow:
            "0 0 0 1px rgba(255,245,190,0.22), inset 0 0 0 1px rgba(255,245,190,0.16), 0 0 28px rgba(212,175,55,0.18)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "31px",
          border: "1px solid rgba(212,175,55,0.62)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "42px",
          border: "1px solid rgba(255,245,190,0.26)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "58px",
          right: "58px",
          top: "54px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.35), rgba(255,245,190,0.75), rgba(212,175,55,0.35), transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "58px",
          right: "58px",
          bottom: "54px",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.35), rgba(255,245,190,0.75), rgba(212,175,55,0.35), transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "22px",
          background:
            "linear-gradient(135deg, rgba(255,245,190,0.16), transparent 18%, transparent 82%, rgba(212,175,55,0.14))",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
    </div>
  );
}