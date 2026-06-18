"use client";

export default function NebulaClouds() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Upper Left Atmosphere */}

      <div
        style={{
          position: "absolute",
          left: "-6%",
          top: "-2%",
          width: "34%",
          height: "42%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(118,58,190,.065) 0%, rgba(82,32,140,.045) 42%, transparent 82%)",
          filter: "blur(95px)",
          transform: "rotate(-12deg)",
        }}
      />

      {/* Upper Right Atmosphere */}

      <div
        style={{
          position: "absolute",
          right: "-10%",
          top: "8%",
          width: "36%",
          height: "38%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(104,48,176,.055) 0%, rgba(72,28,120,.035) 45%, transparent 82%)",
          filter: "blur(105px)",
          transform: "rotate(18deg)",
        }}
      />

      {/* Lower Right Atmosphere */}

      <div
        style={{
          position: "absolute",
          right: "-8%",
          bottom: "-8%",
          width: "42%",
          height: "42%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(112,52,184,.06) 0%, rgba(76,30,128,.04) 46%, transparent 84%)",
          filter: "blur(115px)",
        }}
      />

      {/* Very soft center haze */}

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%, -50%)",
          width: "54%",
          height: "56%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(88,38,150,.025) 0%, transparent 72%)",
          filter: "blur(130px)",
        }}
      />
    </div>
  );
}