"use client";

export default function CinematicVignette() {
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
      {/* Main radial vignette — stronger edge darkening */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 34%, rgba(0,0,0,.20) 58%, rgba(0,0,0,.56) 80%, rgba(0,0,0,.88) 100%)",
        }}
      />

      {/* Top edge darkening */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.32) 0%, rgba(0,0,0,.12) 12%, transparent 28%)",
        }}
      />

      {/* Inset corner shadows */}
      <div
        style={{
          position: "absolute",
          inset: "5%",
          borderRadius: "4px",
          boxShadow:
            "inset 0 0 100px rgba(0,0,0,.50), inset 0 0 200px rgba(0,0,0,.38)",
        }}
      />

      {/* Soft center luminosity */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          transform: "translate(-50%, -50%)",
          width: "60%",
          height: "56%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,.048) 0%, rgba(255,255,255,.018) 42%, transparent 74%)",
          filter: "blur(58px)",
        }}
      />

      {/* Warm gold bottom glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-16%",
          transform: "translateX(-50%)",
          width: "86%",
          height: "28%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(212,175,55,.17) 0%, rgba(212,175,55,.07) 40%, transparent 76%)",
          filter: "blur(42px)",
          opacity: 0.95,
        }}
      />
    </div>
  );
}
