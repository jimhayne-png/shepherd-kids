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
      {/* Outer diffuse purple halo */}
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "148px",
          height: "148px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(160,72,240,.22) 0%, rgba(110,40,190,.12) 38%, rgba(64,18,110,.05) 66%, transparent 84%)",
          filter: "blur(22px)",
        }}
      />

      {/* Inner close aura */}
      <div
        style={{
          position: "absolute",
          top: "26px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "82px",
          height: "82px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200,110,255,.28) 0%, rgba(140,54,216,.14) 44%, transparent 80%)",
          filter: "blur(12px)",
        }}
      />

      {/* Cross */}
      <div
        style={{
          position: "absolute",
          top: "38px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "58px",
          height: "100px",
        }}
      >
        {/* Vertical bar */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            width: "4px",
            height: "100px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,.92) 0%, #ffffff 40%, rgba(255,255,255,.88) 100%)",
            borderRadius: "2px",
            boxShadow:
              "0 0 2px rgba(255,255,255,.98)," +
              "0 0 8px rgba(255,255,255,.60)," +
              "0 0 18px rgba(200,140,255,.38)," +
              "0 0 36px rgba(160,80,255,.18)",
          }}
        />

        {/* Horizontal bar */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "26px",
            transform: "translateX(-50%)",
            width: "54px",
            height: "4px",
            background:
              "linear-gradient(90deg, rgba(255,255,255,.78) 0%, #ffffff 40%, rgba(255,255,255,.78) 100%)",
            borderRadius: "2px",
            boxShadow:
              "0 0 2px rgba(255,255,255,.98)," +
              "0 0 8px rgba(255,255,255,.60)," +
              "0 0 18px rgba(200,140,255,.38)," +
              "0 0 36px rgba(160,80,255,.18)",
          }}
        />

        {/* Center intersection bloom */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "26px",
            transform: "translate(-50%, -50%)",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "rgba(255,255,255,.95)",
            filter: "blur(3px)",
          }}
        />
      </div>
    </div>
  );
}
