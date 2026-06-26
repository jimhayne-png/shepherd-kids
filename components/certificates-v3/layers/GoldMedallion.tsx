"use client";

export default function GoldMedallion() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 36,
        left: "50%",
        transform: "translateX(-50%)",
        width: 104,
        height: 104,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {/* Drop shadow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          filter: "blur(16px)",
          background: "rgba(0,0,0,.60)",
          transform: "translateY(8px) scale(.92)",
        }}
      />

      {/* Outer ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: "-6px",
          borderRadius: "50%",
          filter: "blur(10px)",
          background: "rgba(212,175,55,.18)",
        }}
      />

      {/* Outer metallic gold ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, #fff8d0 0%, #f0cd52 18%, #c8980e 36%, #8b6510 52%, #d0a828 68%, #f8e488 84%, #fff8d0 100%)",
          boxShadow:
            "0 0 28px rgba(212,175,55,.28), inset 0 1px 3px rgba(255,255,255,.65), inset 0 -1px 2px rgba(0,0,0,.40)",
        }}
      />

      {/* Dark gap ring */}
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          background: "#08060f",
        }}
      />

      {/* Inner metallic gold ring */}
      <div
        style={{
          position: "absolute",
          inset: 9,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, #fff0b8 0%, #e8c030 24%, #a07212 48%, #d8b232 72%, #fff4cc 100%)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,.4), inset 0 -1px 2px rgba(0,0,0,.3)",
        }}
      />

      {/* Purple interior */}
      <div
        style={{
          position: "absolute",
          inset: 16,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #6b30b8 0%, #380e6a 38%, #180630 70%, #0c0420 100%)",
          overflow: "hidden",
        }}
      >
        {/* Interior glow */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 46,
            height: 46,
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            background: "rgba(188,120,255,.18)",
            filter: "blur(14px)",
          }}
        />

        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="heartGoldSeal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff4c0" />
              <stop offset="30%" stopColor="#e8c450" />
              <stop offset="65%" stopColor="#b48318" />
              <stop offset="100%" stopColor="#ffe8a0" />
            </linearGradient>
          </defs>

          <path
            d="M50 70 C46 66 27 54 27 38 C27 27 35 21 44 21 C49 21 53 24 50 31 C47 24 51 21 56 21 C65 21 73 27 73 38 C73 54 54 66 50 70Z"
            fill="none"
            stroke="url(#heartGoldSeal)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Primary specular highlight */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 18,
          width: 32,
          height: 10,
          borderRadius: "50%",
          background: "rgba(255,255,255,.52)",
          filter: "blur(5px)",
          transform: "rotate(-28deg)",
        }}
      />

      {/* Secondary small highlight */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 36,
          width: 10,
          height: 5,
          borderRadius: "50%",
          background: "rgba(255,255,255,.30)",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
