"use client";

export default function CrossGlow() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      {/* Soft Purple Aura */}

      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "92px",
          height: "92px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(190,95,255,.34) 0%, rgba(130,50,210,.18) 42%, rgba(70,20,120,.08) 68%, transparent 82%)",
          filter: "blur(14px)",
        }}
      />

      {/* White Cross */}

      <div
        style={{
          position: "absolute",
          top: "46px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "56px",
          height: "78px",
        }}
      >
        {/* Vertical */}

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            width: "5px",
            height: "78px",
            background: "#ffffff",
            borderRadius: "1px",
            boxShadow:
              "0 0 2px rgba(255,255,255,.95)," +
              "0 0 7px rgba(255,255,255,.55)," +
              "0 0 14px rgba(170,85,255,.32)",
          }}
        />

        {/* Horizontal */}

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "21px",
            transform: "translateX(-50%)",
            width: "42px",
            height: "5px",
            background: "#ffffff",
            borderRadius: "1px",
            boxShadow:
              "0 0 2px rgba(255,255,255,.95)," +
              "0 0 7px rgba(255,255,255,.55)," +
              "0 0 14px rgba(170,85,255,.32)",
          }}
        />
      </div>
    </div>
  );
}