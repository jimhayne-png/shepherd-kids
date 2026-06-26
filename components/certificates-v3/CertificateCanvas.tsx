"use client";

import { useState } from "react";
import type { CertificateData } from "./types";
import { getCertBackground } from "./certificateBackgrounds";
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

// ── Layered V3 fallback ───────────────────────────────────────────────────────
// Renders all 10 CSS layers. Used when the static background image fails to
// load (404 or network error). All layer files are preserved; they are simply
// not the primary rendering path while static backgrounds are available.

function LayeredCertificateCanvas({ data }: { data: CertificateData }) {
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
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <CosmosBackground />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <NebulaClouds />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
        <GalaxyDust />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 4 }}>
        <StarField />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
        <CinematicVignette />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 6 }}>
        <PremiumFrame />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 7 }}>
        <ArtworkRegistry certType={data.certType} />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 8 }}>
        <CrossGlow />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 9 }}>
        <CertificateText data={data} />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <GoldMedallion />
      </div>
    </div>
  );
}

// ── Static image canvas (primary renderer for all cert types) ─────────────────
// The static background image provides all artwork: background atmosphere,
// gold frame, cross, type-specific illustrations, and medallion.
// CertificateText overlays all dynamic fields: child name, church name,
// certificate title, blessing, scripture/reference, date, minister name/title.
//
// Template routing:
//   template === "purple"  →  *-premium-landscape.png   (Royal Purple / dark)
//   template === "white"   →  *-classic-landscape.png   (Classic Ivory / light)
//
// Fallback state: `errorPath` tracks which specific image URL failed to load.
// When certType or template changes (new bgPath), `errorPath !== bgPath` so the
// new image gets a fresh attempt before falling back to the CSS layers.

function StaticCertificateCanvas({ data }: { data: CertificateData }) {
  const bgPath = getCertBackground(data.certType, data.template);
  const [errorPath, setErrorPath] = useState<string | null>(null);

  if (errorPath === bgPath) {
    return <LayeredCertificateCanvas data={data} />;
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
      {/* Static background — supplies all artwork baked into the image */}
      <img
        src={bgPath}
        alt=""
        aria-hidden="true"
        onError={() => {
          console.warn(
            `[ShepherdKids] Certificate background not found: ${bgPath}` +
            " — falling back to layered V3 renderer."
          );
          setErrorPath(bgPath);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 1,
          display: "block",
        }}
      />

      {/* Dynamic text overlay — all personalised certificate fields */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <CertificateText data={data} />
      </div>
    </div>
  );
}

// ── Main compositor ───────────────────────────────────────────────────────────
// All cert types use StaticCertificateCanvas.
// LayeredCertificateCanvas is the automatic fallback when the image is absent.

export default function CertificateCanvas({ data }: { data: CertificateData }) {
  return <StaticCertificateCanvas data={data} />;
}
