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
      {/* Upper-left atmosphere */}
      <div
        style={{
          position: "absolute",
          left: "-8%",
          top: "-4%",
          width: "38%",
          height: "46%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(130,64,204,.09) 0%, rgba(90,38,156,.058) 38%, transparent 78%)",
          filter: "blur(112px)",
          transform: "rotate(-14deg)",
        }}
      />

      {/* Upper-right atmosphere */}
      <div
        style={{
          position: "absolute",
          right: "-12%",
          top: "5%",
          width: "40%",
          height: "44%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(116,54,188,.075) 0%, rgba(80,34,132,.048) 40%, transparent 78%)",
          filter: "blur(122px)",
          transform: "rotate(16deg)",
        }}
      />

      {/* Lower-right atmosphere */}
      <div
        style={{
          position: "absolute",
          right: "-10%",
          bottom: "-10%",
          width: "46%",
          height: "48%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(122,58,196,.085) 0%, rgba(82,36,140,.054) 42%, transparent 80%)",
          filter: "blur(128px)",
        }}
      />

      {/* Lower-left atmosphere */}
      <div
        style={{
          position: "absolute",
          left: "-8%",
          bottom: "-8%",
          width: "42%",
          height: "44%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(110,50,178,.075) 0%, rgba(70,28,122,.048) 42%, transparent 80%)",
          filter: "blur(122px)",
          transform: "rotate(12deg)",
        }}
      />

      {/* Soft center haze */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%, -50%)",
          width: "60%",
          height: "62%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(96,44,162,.034) 0%, transparent 68%)",
          filter: "blur(144px)",
        }}
      />
    </div>
  );
}
