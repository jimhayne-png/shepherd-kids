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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 38%, rgba(0,0,0,.18) 62%, rgba(0,0,0,.48) 84%, rgba(0,0,0,.78) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "7%",
          borderRadius: "6px",
          boxShadow:
            "inset 0 0 90px rgba(0,0,0,.42), inset 0 0 180px rgba(0,0,0,.34)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "46%",
          transform: "translate(-50%, -50%)",
          width: "62%",
          height: "58%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,.045) 0%, rgba(255,255,255,.02) 44%, transparent 76%)",
          filter: "blur(55px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-13%",
          transform: "translateX(-50%)",
          width: "82%",
          height: "26%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(212,175,55,.13) 0%, rgba(212,175,55,.055) 42%, transparent 78%)",
          filter: "blur(38px)",
          opacity: 0.9,
        }}
      />
    </div>
  );
}