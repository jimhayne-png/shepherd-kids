"use client";

import type { CertificateData } from "./types";
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

export default function CertificateCanvas({ data }: { data: CertificateData }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "11 / 8.5",
      background: data.template === "purple" ? "#08060D" : "#FDFAEF",
      overflow: "hidden",
      borderRadius: "4px",
      border: "1px solid rgba(212,175,55,0.2)",
    }}>
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
