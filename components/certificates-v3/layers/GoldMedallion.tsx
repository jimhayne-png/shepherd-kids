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
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          filter: "blur(10px)",
          background: "rgba(0,0,0,.48)",
          transform: "translateY(6px) scale(.96)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg,#fff0ad 0%,#d4af37 22%,#8b6914 48%,#f4d878 72%,#fff4bf 100%)",
          boxShadow:
            "0 0 20px rgba(212,175,55,.22), inset 0 1px 2px rgba(255,255,255,.6)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          background: "#09070d",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 9,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg,#ffe8a4 0%,#cfaa2f 28%,#8f6a12 52%,#f5d76d 78%,#fff1b2 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 16,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, #552696 0%, #2d104e 40%, #13071e 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 42,
            height: 42,
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            background: "rgba(177,110,255,.16)",
            filter: "blur(12px)",
          }}
        />

        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="heartGoldSeal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff2b6" />
              <stop offset="35%" stopColor="#e4c052" />
              <stop offset="70%" stopColor="#b48316" />
              <stop offset="100%" stopColor="#ffe79f" />
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

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 21,
          width: 30,
          height: 9,
          borderRadius: "50%",
          background: "rgba(255,255,255,.45)",
          filter: "blur(5px)",
          transform: "rotate(-28deg)",
        }}
      />
    </div>
  );
}