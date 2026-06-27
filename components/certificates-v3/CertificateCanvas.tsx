"use client";

import { useState } from "react";
import type { CertificateData } from "./types";
import { getCertBackground } from "./certificateBackgrounds";
import CertificateStaticOverlay from "./layers/CertificateStaticOverlay";

// ── Layered V3 fallback ───────────────────────────────────────────────────────
// Only used when the PNG background is genuinely absent (404 / network error).
// All artwork — frame, cross, medallion, stars, nebula, balloons — is baked into
// the PNG. These CSS layers are a last-resort so the certificate is never blank.
import CosmosBackground from "./layers/CosmosBackground";
import NebulaClouds from "./layers/NebulaClouds";
import GalaxyDust from "./layers/GalaxyDust";
import StarField from "./layers/StarField";
import CinematicVignette from "./layers/CinematicVignette";
import PremiumFrame from "./layers/PremiumFrame";
import ArtworkRegistry from "./artwork/ArtworkRegistry";
import CrossGlow from "./layers/CrossGlow";
import CertificateText from "./layers/CertificateText";
import GoldMedallion from "./layers/GoldMedallion";

export type { CertificateData };

function LayeredFallback({ data }: { data: CertificateData }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "11 / 8.5",
        background: data.template === "purple" ? "#08060D" : "#FDFAEF",
        overflow: "hidden",
        borderRadius: "4px",
        border: "1px solid rgba(212,175,55,0.2)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}><CosmosBackground /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}><NebulaClouds /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}><GalaxyDust /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 4 }}><StarField /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 5 }}><CinematicVignette /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 6 }}><PremiumFrame /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 7 }}><ArtworkRegistry certType={data.certType} /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 8 }}><CrossGlow /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 9 }}><CertificateText data={data} /></div>
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}><GoldMedallion /></div>
    </div>
  );
}

// ── Primary renderer ──────────────────────────────────────────────────────────
// When the PNG exists the certificate is exactly two things:
//   1. Background image  (all artwork — frame, cross, illustrations, medallion)
//   2. CertificateStaticOverlay  (text only — name, title, date, scripture, etc.)
//
// Nothing else is rendered. LayeredFallback is only reached on a real 404.
// errorPath tracks which URL failed so switching cert type / template retries
// the new path instead of staying in fallback.

function CertificateCanvas({ data }: { data: CertificateData }) {
  const bgPath = getCertBackground(data.certType, data.template);
  const [errorPath, setErrorPath] = useState<string | null>(null);

  if (errorPath === bgPath) {
    return <LayeredFallback data={data} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "11 / 8.5",
        background: data.template === "purple" ? "#08060D" : "#FDFAEF",
        overflow: "hidden",
        borderRadius: "4px",
        border: "1px solid rgba(212,175,55,0.2)",
      }}
    >
      <img
        src={bgPath}
        alt=""
        aria-hidden="true"
        onError={() => {
          console.warn(`[ShepherdKids] Background not found: ${bgPath} — using layered fallback.`);
          setErrorPath(bgPath);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          zIndex: 1,
          display: "block",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <CertificateStaticOverlay data={data} />
      </div>
    </div>
  );
}

export default CertificateCanvas;
